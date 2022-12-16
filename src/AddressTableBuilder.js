const AddressTableBuilder = function () {
  let _addressTable;
  return {
    build: function() {
      if (_addressTable) return _addressTable;
      const addresses = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AddressSheet.NAME).getDataRange().getValues();
      _addressTable = new AddressTable(addresses);
      return _addressTable;
    }
  }
}();

function testAddressTableBuilder() {
  const addressTable = AddressTableBuilder.build();
  const address = addressTable.fromPrefix("AV").address;
  if (!(address === "141 Aptos Village Way, Aptos, CA 95003")) {
    throw Error("Expected to find address for 'AV' prefix");
  }
  const addressTable2 = AddressTableBuilder.build();
  if (!(addressTable === addressTable2)) {
    throw Error("Expected AddressTableBuilder to memoize the built table");
  }
}
