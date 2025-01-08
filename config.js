module.exports = {
    port: process.env.PORT || 3000,
    dataPath: process.env.DATA_PATH || './data',
    backupLimit: 5,
    backupInterval: 24 * 60 * 60 * 1000, // 1天
    
    // 开发环境配置
    isDev: process.env.NODE_ENV !== 'production',
    
    // 限流配置
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100 // 限制100次请求
    }
}; 