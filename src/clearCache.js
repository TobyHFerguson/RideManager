function clearCache() {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['Globals', 'Groups']);
    Logger.log('Cache cleared');
}