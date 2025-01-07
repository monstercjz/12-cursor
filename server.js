const express = require('express');
const fs = require('fs');
const cors = require('cors');
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

// 保存网站数据
app.post('/api/sites', (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body));
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('服务器运行在 http://localhost:3000');
}); 