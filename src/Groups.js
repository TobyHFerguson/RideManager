function getGroupSpecs() {
  const cache = CacheService.getScriptCache();
  let cachedGroups = cache.get('groups');
  if (cachedGroups) {
    return JSON.parse(cachedGroups);
  } else {
    return initializeGroupCache();
  }
}

function initializeGroupCache() {
  const cache = CacheService.getScriptCache();
  let groups = getGroupsFromSheet_();
  cache.put('groups', JSON.stringify(groups), 21600); // Cache for 6 hours
  return groups;
}

function getGroupsFromSheet_() {
  const fiddler = bmPreFiddler.PreFiddler().getFiddler({
    sheetName: 'Groups',
    createIfMissing: false
  });
  let groups = flatten(fiddler.getData());
  return groups;
}

function flatten(groups) {
  // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
  groups = groups.reduce((acc, { Group, ...rest }) => {
    acc[Group] = rest;
    return acc;
  }, {});
  return groups;
}
