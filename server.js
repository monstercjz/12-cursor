const express = require('express');
const fs = require('fs');
const cors = require('cors');
const version = require('./version.json');
const app = express();

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = 'sites.json';

// 确保数据文件存在
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        title: "我的网站导航",
        sites: [],
        groups: ['默认分组']
    }));
}

// 获取所有网站数据
app.get('/api/sites', (req, res) => {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
});

// 数据验证中间件
function validateData(req, res, next) {
    const data = req.body;
    if (!data || !Array.isArray(data.sites)) {
        return res.status(400).json({ error: '无效的数据格式' });
    }
    next();
}

// 保存网站数据
app.post('/api/sites', validateData, (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ 
            error: '保存失败',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 添加访问统计API
app.post('/api/sites/:id/visit', async (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const site = data.sites[req.params.id];
        
        if (!site.stats) {
            site.stats = {
                visitCount: 0,
                lastVisit: null
            };
        }
        
        site.stats.visitCount++;
        site.stats.lastVisit = new Date().toISOString();
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '统计更新失败' });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 版本信息接口
app.get('/api/version', (req, res) => {
    res.json({
        version: version.version,
        lastUpdate: version.lastUpdate
    });
});

app.listen(3000, () => {
    console.log('服务器运行在 http://localhost:3000');
}); 