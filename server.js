const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const version = require('./version.json');
const app = express();

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = 'sites.json';

// 创建备份目录
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// 自动备份函数
function createBackup() {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup_${date}_${time}.json`);
    
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        fs.writeFileSync(backupFile, data);
        console.log(`备份已创建: ${backupFile}`);
        
        // 清理7天前的备份
        cleanupOldBackups();
    } catch (error) {
        console.error('备份创建失败:', error);
    }
}

// 手动执行清理函数
function cleanupOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith('.json')); // 只处理json文件
    
    // 按修改时间排序，新的在前
    const sortedFiles = files
        .map(file => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                mtime: stats.mtime
            };
        })
        .sort((a, b) => b.mtime - a.mtime);
    
    // 保留最新的5个备份，删除其他的
    if (sortedFiles.length > 5) {
        sortedFiles.slice(5).forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`已删除旧备份: ${file.name}`);
        });
    }
}

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
    try {
        // 基本格式验证
        if (!data || !Array.isArray(data.sites)) {
            throw new Error('无效的数据格式');
        }
        
        // 验证每个网站的数据
        data.sites.forEach(site => {
            if (!site.name || site.name.trim().length < 2 || /^\d+$/.test(site.name)) {
                throw new Error('网站名称至少需要2个字符，且不能只是数字');
            }
            
            if (!site.url || /^\d+$/.test(site.url)) {
                throw new Error('无效的网站地址');
            }
            
            try {
                new URL(site.url.startsWith('http') ? site.url : 'https://' + site.url);
            } catch {
                throw new Error('网站地址格式不正确');
            }
        });
        
        next();
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

/**
 * 统一的错误响应处理
 * @param {Error} error - 错误对象
 * @param {Response} res - Express响应对象
 * @param {string} message - 错误消息
 */
function handleError(error, res, message = '操作失败') {
    console.error(error);
    res.status(500).json({
        error: message,
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}

// 保存网站数据
app.post('/api/sites', validateData, (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        // 创建备份
        createBackup();
        res.json({ success: true });
    } catch (error) {
        handleError(error, res, '保存失败');
    }
});

// 获取备份列表
app.get('/api/backups', (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const stats = fs.statSync(path.join(BACKUP_DIR, file));
                return {
                    name: file,
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date - a.date);
        
        res.json(files);
    } catch (error) {
        handleError(error, res, '获取备份列表失败');
    }
});

// 恢复指定备份
app.post('/api/backups/restore/:file', (req, res) => {
    try {
        const backupFile = path.join(BACKUP_DIR, req.params.file);
        if (!fs.existsSync(backupFile)) {
            throw new Error('备份文件不存在');
        }
        
        // 先备份当前数据
        createBackup();
        
        // 恢复备份数据
        const backupData = fs.readFileSync(backupFile, 'utf8');
        fs.writeFileSync(DATA_FILE, backupData);
        
        res.json({ success: true });
    } catch (error) {
        handleError(error, res, '恢复备份失败');
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
        handleError(error, res, '统计更新失败');
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
    // 立即执行一次清理
    cleanupOldBackups();
}); 