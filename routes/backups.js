const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

// 获取备份列表
router.get('/', (req, res) => {
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
        next(error);
    }
});

// 恢复备份
router.post('/restore/:file', (req, res) => {
    try {
        const backupFile = path.join(BACKUP_DIR, req.params.file);
        if (!fs.existsSync(backupFile)) {
            return res.status(404).json({ error: '备份文件不存在' });
        }
        
        const backupData = fs.readFileSync(backupFile, 'utf8');
        fs.writeFileSync('sites.json', backupData);
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 