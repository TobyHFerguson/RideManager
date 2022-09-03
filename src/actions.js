function do_action(form) {
  linkRouteURLs();
  if (form.email === undefined || form.password === undefined) {
    askForCredentials(form.method);
  } else {
    const rwgpsService = new RWGPSService(form.email, form.password);
    const rwgps = new RWGPS(rwgpsService);
    const schedule = new Schedule();
    let rows = schedule.getSelectedRows();
    this[form.method](rows, rwgps);
  }
}
