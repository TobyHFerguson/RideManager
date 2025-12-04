function clearCache() {
    const cache = CacheService.getDocumentCache();
    cache.removeAll(['Globals', 'Groups', 'PersonalTemplates']);
    Logger.log('Cache cleared');
}