function getGroupNames() {
  return Object.keys(getGroupSpecs());  // ["A", "B", "C", ...]
}

function getGroupSpecs() {
  const cache = CacheService.getScriptCache();
  let cachedGroups = cache.get('groups');
  if (cachedGroups) {
    return JSON.parse(cachedGroups);
  } else {
    return initializeGroupCache_();
  }
}

function initializeGroupCache_() {
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
  let groups = flatten_(fiddler.getData());
  return groups;
}

function flatten_(groups) {
  // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
  groups = groups.reduce((acc, { Group, ...rest }) => {
    acc[Group] = rest;
    return acc;
  }, {});
  return groups;
}

if(typeof module !== 'undefined') {
  module.exports = { getGroupNames, getGroupSpecs };
}
