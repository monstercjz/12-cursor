const fetch = require('node-fetch');

async function checkSiteHealth(url) {
    try {
        const start = Date.now();
        const response = await fetch(url);
        const responseTime = Date.now() - start;
        
        return {
            status: response.status,
            responseTime,
            isAlive: response.ok,
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 0,
            error: error.message,
            isAlive: false,
            lastCheck: new Date().toISOString()
        };
    }
}

module.exports = { checkSiteHealth }; 