

const PUBLIC = 0;
const EVENT_MANAGERS_ONLY = 1;
const MEMBERS_ONLY = 2;



class Event {
 static makeRideName(start_date, start_time, group, route_name) {
  return `${start_date.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short" })} '${group}' Ride (${start_date.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric" })} ${start_time.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric" })}) ${route_name}`;
}
constructor(row) {


  if (typeof row == "undefined") {
    throw new RangeError("EventObject cannot be created with an undefined row");
  }


  this.row = row;
  this.errors = [];
  this.warnings = [];
  this.rowNum = row.rowNum;

  this.auto_expire_participants = "1";
  this.all_day = "0";
  this.visibility = EVENT_MANAGERS_ONLY;
  try {
    try {
      let options = { timeZone: "America/Los_Angeles" };
      this.start_date = row.getStartDate().toLocaleDateString("en-CA", options);
    } catch (e) {
      Logger.log(`makeEventObject() threw ${e} for row ${row.rowNum} ${row.getStartDate()}`);
      this.errors.push('start date column does not contain a date');
    }
    try {
      let options = { timeZone: "America/Los_Angeles" };
      this.start_time = row.getStartTime().toLocaleTimeString("en-US", options);
      this.meet_time = (new Date(Number(row.getStartTime()) - 15 * 60 * 1000)).toLocaleTimeString("en-US", options);
    } catch (e) {
      Logger.log(`makeEventObject() threw ${e} for row ${row.rowNum} ${row.getStartTime()}`);
      this.errors.push('start time column does not contain a time');
    }

    switch (row.getGroup()) {
      case undefined:
      case null:
      case "":
        this.errors.push("Group column is empty");
        break;
      case "A":
      case "B":
      case "C":
        this.group = row.getGroup();
        break;
      default:
        this.errors.push(`Unknown group: ${row.getGroup()}`);
    }
    if (row.getRouteName() === null || row.getRouteName() === "") {
      this.errors.push("No route name defined for this ride");
    }
    try {
      let url = row.getRouteURL().split('?')[0]
      const response = UrlFetchApp.fetch(url + ".json");
      if (JSON.parse(response.getContentText()).user_id !== SCCCC_USER_ID) {
        this.errors.push('Route is not owned by SCCCC');
      } else {
        this.route_ids = [row.getRouteURL().split('/')[4]];
      }

    } catch (e) {
      Logger.log(`EventObject.constructor() threw: ${e}`);
      this.errors.push("No route URL defined for this ride");
    }


  } catch (e) {
    Logger.log(`MakeEventObject() threw: ${e}`);
    this.errors.push(e);
  }
  this.name = row.getRideName();
  if ((this.name == null || this.name === "") && this.errors.length === 0) {
    this.name = makeRideName(row.getStartDate(), row.getStartTime(), row.getGroup(), row.getRouteName());
  }
  this.location = row.getLocation();
  if (this.location == "" || this.location == "#VALUE!") {
    this.warnings.push("Location is unknown");
    this.location = "";
  };
  this.address = row.getAddress();
  if (this.address == "" || this.address == "#VALUE!") {
    this.warnings.push("Address is unknown");
    this.address = "";
  };
  this.organizer_name = row.getRideLeader();
  if (this.organizer_name === "") {
    this.warnings.push(`Ride Leader will default to '${RIDE_LEADER_TBD_NAME}'`);
  }
  this.desc = `${this.address}
          
Arrive ${this.meet_time} for a ${this.start_time} rollout.
  
All participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709
  
Note: In a browser use the "Go to route" link below to open up the route.`;

  return this;
}

setRideLink(url) {
  this.row.setRideLink(this.name, url);
}

updateRideName() {
  this.name = Event.makeRideName(this.row.getStartDate(), this.row.getStartTime(), this.row.getGroup(), this.row.getRouteName());
  this.row.setRideLink(this.name, this.getRideLinkURL());
}

getRideLinkURL() {
  return this.row.getRideURL();
}

deleteRideLinkURL() {
  this.row.deleteRideLink();
}
}

