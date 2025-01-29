function getGroups() {
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
  let groups = getGroupsFromSheet();
  cache.put('groups', JSON.stringify(groups), 21600); // Cache for 6 hours
  return groups;
}

function getGroupsFromSheet() {
  const fiddler = bmPreFiddler.PreFiddler().getFiddler({
    sheetName: 'Groups',
    createIfMissing: false
  });
  let groups = fiddler.getData();
  // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
  groups = groups.reduce((acc, curr) => {
    const { Group, ...rest } = curr;
    acc.push({ [`${Group}`]: rest });
    return acc;
  }, []);
  // groups = [ {"A": {"TEMPLATE": ..., "MIN_LENGTH": ...}}, {"B": {{"TEMPLATE": ..., "MIN_LENGTH": ...}}}]
  const g2 = groups.reduce((acc, curr) => {
    const [key, value] = Object.entries(curr)[0];
    acc[key] = value;
    return acc;
  }, {});
  return g2;
}