// 版本更新脚本
const fs = require('fs');
const path = require('path');

/**
 * 更新版本号
 * @param {'major' | 'minor' | 'patch'} type - 更新类型
 */
function updateVersion(type = 'patch') {
    const versionFile = path.join(__dirname, '../version.json');
    const packageFile = path.join(__dirname, '../package.json');
    
    // 读取版本文件
    const versionData = require(versionFile);
    const packageData = require(packageFile);
    
    // 解析当前版本
    const [major, minor, patch] = versionData.version.split('.').map(Number);
    
    // 更新版本号
    let newVersion;
    switch (type) {
        case 'major':
            newVersion = `${major + 1}.0.0`;
            break;
        case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            break;
        case 'patch':
            newVersion = `${major}.${minor}.${patch + 1}`;
            break;
    }
    
    // 更新版本信息
    versionData.version = newVersion;
    versionData.lastUpdate = new Date().toISOString().split('T')[0];
    packageData.version = newVersion;
    
    // 保存更新
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    fs.writeFileSync(packageFile, JSON.stringify(packageData, null, 2));
    
    console.log(`版本已更新至 ${newVersion}`);
}

module.exports = { updateVersion }; 