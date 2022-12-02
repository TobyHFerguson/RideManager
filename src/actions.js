function do_action(form) {
  if (form.email === undefined || form.password === undefined) {
    askForCredentials(form.method);
  } else {
    const rwgpsService = new RWGPSService(form.email, form.password);
    const rwgps = new RWGPS(rwgpsService);
    let rows = Schedule.getSelectedRows();
    try {
      this[form.method](rows, rwgps);
    } finally {
      Schedule.save();
    }
    

  }
}
