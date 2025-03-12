function clearCache() {
    const cache = CacheService.getDocumentCache();
    cache.removeAll(['Globals', 'Groups']);
    Logger.log('Cache cleared');
}