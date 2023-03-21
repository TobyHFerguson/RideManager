function do_action(form) {
  if (form.email === undefined || form.password === undefined) {
    askForCredentials(form.method);
  } else {
    const rwgpsService = new RWGPSService(form.email, form.password);
    const rwgps = new RWGPS(rwgpsService);
    let rows = Schedule.getSelectedRows();
    console.info('User %s', Session.getActiveUser());
    console.info('processing rows', rows.map(row => row.rowNum))
    try {
      this[form.method](rows, rwgps);
    } catch( e ){
      console.error(e)
      throw(e)
    }
    finally {
      Schedule.save();
    }
    

  }
}
