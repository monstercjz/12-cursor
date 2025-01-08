// 版本更新脚本
const fs = require('fs');
const path = require('path');

/**
 * 更新版本号
 * @param {string} type - 更新类型：'major'|'minor'|'patch'
 */
function updateVersion(type = 'patch') {
    // 文件路径
    const versionFile = path.join(__dirname, '../version.json');
    const packageFile = path.join(__dirname, '../package.json');
    
    // 读取配置文件
    const versionData = require(versionFile);
    const packageData = require(packageFile);
    
    // TODO: 实现版本号更新逻辑
    
    // 保存更新
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    fs.writeFileSync(packageFile, JSON.stringify(packageData, null, 2));
}

updateVersion(process.argv[2]); 