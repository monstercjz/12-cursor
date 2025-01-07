const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const path = require('path');
const https = require('https');

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

// 创建图标存储目录
const ICONS_DIR = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 在服务器启动时确保默认图标存在
const DEFAULT_ICON = path.join(ICONS_DIR, 'default.ico');
if (!fs.existsSync(DEFAULT_ICON)) {
    // 创建一个简单的默认图标或复制一个已有的图标文件
    fs.copyFileSync(path.join(__dirname, 'public', 'default.ico'), DEFAULT_ICON);
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

// 添加图标下载和获取接口
app.get('/api/favicon/:domain', async (req, res) => {
    try {
        const domain = req.params.domain;
        const iconPath = path.join(ICONS_DIR, `${domain}.ico`);
        
        // 检查本地是否存在
        if (fs.existsSync(iconPath)) {
            const stats = fs.statSync(iconPath);
            // 如果图标文件大小为0，返回默认图标
            if (stats.size === 0) {
                res.sendFile(DEFAULT_ICON);
                return;
            }
            res.sendFile(iconPath);
            return;
        }
        
        // 从远程获取并保存
        const iconUrl = `https://favicon.zhusl.com/ico/${domain}`;
        const iconFile = fs.createWriteStream(iconPath);
        
        const request = https.get(iconUrl, (response) => {
            if (response.statusCode === 200) {
                response.pipe(iconFile);
                iconFile.on('finish', () => {
                    iconFile.close(() => {
                        // 检查下载的文件是否有效
                        const stats = fs.statSync(iconPath);
                        if (stats.size === 0) {
                            fs.unlinkSync(iconPath);
                            res.sendFile(DEFAULT_ICON);
                        } else {
                            res.sendFile(iconPath);
                        }
                    });
                });
            } else {
                iconFile.close();
                fs.unlinkSync(iconPath);
                res.sendFile(DEFAULT_ICON);
            }
        });

        request.on('error', (err) => {
            iconFile.close();
            fs.unlink(iconPath, () => {
                res.sendFile(DEFAULT_ICON);
            });
        });

        // 设置请求超时
        request.setTimeout(5000, () => {
            request.abort();
            iconFile.close();
            fs.unlink(iconPath, () => {
                res.sendFile(DEFAULT_ICON);
            });
        });
        
    } catch (error) {
        console.error('获取图标出错:', error);
        res.sendFile(DEFAULT_ICON);
    }
});

// 定期清理长期未使用的图标
function cleanupIcons() {
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30天
    
    fs.readdir(ICONS_DIR, (err, files) => {
        if (err) return;
        
        files.forEach(file => {
            if (file === 'default.ico') return;
            
            const filePath = path.join(ICONS_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                const age = Date.now() - stats.mtime.getTime();
                if (age > MAX_AGE) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}

// 每周运行一次清理
setInterval(cleanupIcons, 7 * 24 * 60 * 60 * 1000);

app.listen(3000, () => {
    console.log('服务器运行在 http://localhost:3000');
}); 