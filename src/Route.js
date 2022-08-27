class Route {
  constructor(url) {
    this.url = url;
    const response = UrlFetchApp.fetch(url + ".json");
    this.route = JSON.parse(response.getContentText());
  }
  ownedBySCCCC() {
    return this.route.user_id === SCCCC_USER_ID; 
  }
  getId() {
    return this.url.split('/')[4]
  }
}
