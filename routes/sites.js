const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const DATA_FILE = 'sites.json';

// 验证中间件
const validateSite = [
    body('name').trim().isLength({ min: 2 }),
    body('url').isURL(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// 获取所有网站
router.get('/', (req, res) => {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
});

// 添加网站
router.post('/', validateSite, (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        data.sites.push(req.body);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 