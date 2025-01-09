let sites = [];
let groups = [];
let pageTitle = "我的网站导航";

// 添加新的全局变量
// const FAVICON_CACHE_KEY = 'favicon_cache';
// const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

// 从服务器获取数据
async function loadSites() {
    showLoading();
    try {
        const response = await fetch('http://localhost:3000/api/sites');
        const data = await response.json();
        
        // 1. 先显示数据，提升用户体验
        sites = data.sites || [];
        groups = data.groups || [];
        pageTitle = data.title || "我的网站导航";
        
        updateGroupSelect();
        displaySites();
        document.getElementById('mainTitle').textContent = pageTitle;
        
        // 2. 后台检查数据有效性
        const hasInvalidData = sites.some(site => 
            !Validator.siteName(site.name) || 
            !Validator.url(site.url)
        );
        
        // 3. 如果有无效数据，延迟清理
        if (hasInvalidData) {
            setTimeout(() => {
                if (cleanupSites()) {
                    displaySites(); // 只在实际清理后更新显示
                }
            }, 2000); // 延迟2秒执行清理
        }
    } catch (error) {
        handleError(error, '加载数据');
    } finally {
        hideLoading();
    }
}

// 添加加载状态管理
function showLoading() {
    // 如果没有loading元素，创建一个
    let loading = document.getElementById('loading');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">加载中...</div>
        `;
        document.body.appendChild(loading);
    }
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// 保存数据到服务器
async function saveSites() {
    try {
        await fetch('http://localhost:3000/api/sites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                sites, 
                groups,
                title: pageTitle 
            })
        });
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存数据失败，请检查服务器是否运行');
    }
}

// 切换添加表单显示状态
function toggleAddForm() {
    const form = document.getElementById('addForm');
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

// 显示添加分组表单
function showAddGroupForm() {
    document.getElementById('addGroupForm').style.display = 'flex';
}

// 隐藏添加分组表单
function hideAddGroupForm() {
    document.getElementById('addGroupForm').style.display = 'none';
}

// 添加分组
async function addGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        alert('请输入分组名称！');
        return;
    }
    
    groups.push(groupName);
    await saveSites();
    updateGroupSelect();
    displaySites();
    hideAddGroupForm();
    document.getElementById('groupName').value = '';
}

// 更新分组选择下拉框
function updateGroupSelect() {
    const select = document.getElementById('groupSelect');
    select.innerHTML = `
        <option value="">未分组</option>
        ${groups.map((group, index) => `
            <option value="${index}">${group}</option>
        `).join('')}
    `;
}

// 添加验证模块
const Validator = {
    url(url) {
        if (!url) return false;
        // 不允许单个数字或字符作为URL
        if (/^\d+$/.test(url)) return false;
        
        try {
            new URL(url.startsWith('http') ? url : 'https://' + url);
            return true;
        } catch {
            return false;
        }
    },
    
    siteName(name) {
        const trimmed = name.trim();
        // 名称至少2个字符，不能只是数字
        return trimmed.length >= 2 && !/^\d+$/.test(trimmed);
    },
    
    groupName(name) {
        return name && name.trim().length > 0;
    }
};

// 统一的用户提示
function handleUserInput(message, type = 'error') {
    showToast(message, type);
}

/**
 * 验证并格式化网站输入
 * @param {string} name - 网站名称
 * @param {string} url - 网站地址
 * @param {string} description - 网站描述
 * @returns {Object} 格式化后的网站数据
 */
function formatSiteInput(name, url, description) {
    if (!Validator.siteName(name)) {
        throw new Error('网站名称不能为空');
    }
    
    if (!Validator.url(url)) {
        throw new Error('请输入有效的网址');
    }
    
    // 确保URL包含协议
    const formattedUrl = url.startsWith('http') ? url : 'https://' + url;
    
    return {
        name: name.trim(),
        url: formattedUrl,
        description: description.trim()
    };
}

/**
 * 网站数据接口
 * @typedef {Object} Site
 * @property {string} name - 网站名称
 * @property {string} url - 网站地址
 * @property {string} [description] - 网站描述
 * @property {number} [groupIndex] - 分组索引
 */

/**
 * 添加新网站
 * @param {Site} siteData - 网站数据
 * @returns {Promise<void>}
 * @throws {Error} 当验证失败或保存失败时
 */
async function addSite(siteData) {
    try {
        const name = document.getElementById('siteName').value;
        const url = document.getElementById('siteUrl').value;
        const description = document.getElementById('siteDesc').value;
        const groupSelect = document.getElementById('groupSelect');
        const groupIndex = groupSelect.value ? parseInt(groupSelect.value) : undefined;
        
        const siteData = formatSiteInput(name, url, description);
        
        // 添加加载状态
        showLoading();
        
        let iconUrl = '/icons/default-icon.png';
        
        // 异步执行 getFavicon
        setTimeout(async () => {
            try {
                const icon = await getFavicon(siteData.url);
                iconUrl = icon;
            } catch (error) {
                console.error('获取图标失败:', error);
            } finally {
                sites.push({
                    ...siteData,
                    groupIndex,
                    icon: iconUrl,
                    stats: {
                        visitCount: 0,
                        lastVisit: null
                    }
                });
                
                // 清理并去重
                cleanupSites();
                
                await saveSites();
                displaySites();
                toggleAddForm();
                
                // 清空表单
                document.getElementById('siteName').value = '';
                document.getElementById('siteUrl').value = '';
                document.getElementById('siteDesc').value = '';
                groupSelect.value = '';
                
                showToast('添加网站成功', 'success');
                hideLoading(); // 移除加载状态
            }
        }, 0);
        
    } catch (error) {
        handleError(error, '添加网站');
    }
}

// 删除网站
async function deleteSite(index) {
    sites.splice(index, 1);
    await saveSites();
    displaySites();
}

// 1. 防抖处理
const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

// 2. 优化搜索功能
const searchSites = debounce((keyword) => {
    filterSites(keyword.toLowerCase());
}, 300);

// 显示网站列表
function displaySites() {
    const fragment = document.createDocumentFragment();
    const sitesList = document.getElementById('sitesList');
    
    // 显示未分组的网站
    const ungroupedSites = sites.filter(site => site.groupIndex === undefined);
    if (ungroupedSites.length > 0) {
        const ungroupedContainer = document.createElement('div');
        ungroupedContainer.className = 'no-group-container';
        
        const siteList = document.createElement('div');
        siteList.className = 'site-list';
        
        ungroupedSites.forEach(site => {
            const siteElement = createSiteElement(site);
            siteList.appendChild(siteElement);
        });
        
        ungroupedContainer.appendChild(siteList);
        fragment.appendChild(ungroupedContainer);
    }
    
    // 显示分组的网站
    groups.forEach((groupName, groupIndex) => {
        const groupSites = sites.filter(site => site.groupIndex === groupIndex);
        
        if (groupSites.length > 0) {
            const groupContainer = document.createElement('div');
            groupContainer.className = 'group-container';
            groupContainer.draggable = true;
            groupContainer.dataset.groupIndex = groupIndex;
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `
                <h3 class="group-title" data-group-index="${groupIndex}">${groupName}</h3>
            `;
            
            const siteList = document.createElement('div');
            siteList.className = 'site-list';
            
            groupSites.forEach(site => {
                const siteElement = createSiteElement(site);
                siteList.appendChild(siteElement);
            });
            
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(siteList);
            fragment.appendChild(groupContainer);
        }
    });
    
    sitesList.innerHTML = '';
    sitesList.appendChild(fragment);
    
    // 在添加完所有元素后调用拖拽监听器
    addDragListeners();
}

// 创建网站元素的辅助函数
function createSiteElement(site) {
    const siteElement = document.createElement('div');
    siteElement.className = 'site-item';
    
    siteElement.innerHTML = `
        <a href="${site.url}" target="_blank" class="site-link" data-site-index="${sites.indexOf(site)}">
            ${site.icon ? `<img src="${site.icon}" class="site-icon" alt="${site.name}">` : 
            `<img src="/icons/default-icon.png" class="site-icon" alt="${site.name}">`}
            ${site.name}
            <div class="tooltip">
                <div class="tooltip-content">
                    <div>${site.description ? `<strong>描述:</strong> ${site.description}` : ''}</div>
                    <div><strong>地址:</strong> ${site.url}</div>
                </div>
            </div>
        </a>
        <button class="delete-btn" onclick="deleteSite(${sites.indexOf(site)})">删除</button>
    `;
    
    const siteLink = siteElement.querySelector('.site-link');
    siteLink.addEventListener('click', (e) => {
        const siteIndex = parseInt(e.currentTarget.dataset.siteIndex);
        trackSiteVisit(siteIndex);
    });
    
    // 显示访问统计信息
    if (site.stats && site.stats.visitCount > 0) {
        const lastVisit = new Date(site.stats.lastVisit);
        siteElement.querySelector('.tooltip-content').insertAdjacentHTML('beforeend', `
            <div><strong>访问:</strong> ${site.stats.visitCount}次</div>
            <div><strong>最近:</strong> ${lastVisit.toLocaleDateString()}</div>
        `);
    }
    
    return siteElement;
}

// 添加网站编辑相关函数
function createSiteEditForm() {
    const editForm = document.createElement('div');
    editForm.className = 'site-edit-form';
    editForm.innerHTML = `
        <input type="text" id="siteEditName" placeholder="网站名称">
        <input type="text" id="siteEditUrl" placeholder="网站地址">
        <input type="text" id="siteEditDesc" placeholder="网站描述">
        <select id="siteEditGroup">
            <option value="">未分组</option>
            ${groups.map((group, index) => `<option value="${index}">${group}</option>`).join('')}
        </select>
        <div class="buttons">
            <button class="delete-confirm" onclick="confirmDelete()">删除</button>
            <button onclick="saveSiteEdit()">保存</button>
            <button class="cancel-btn" onclick="hideSiteEditForm()">取消</button>
        </div>
    `;
    document.body.appendChild(editForm);
}

let currentEditingSiteIndex = -1;

// 在 DOMContentLoaded 事件中添加网站右键菜单处理
document.addEventListener('DOMContentLoaded', () => {
    const titleElement = document.getElementById('mainTitle');
    
    // 创建编辑表单
    const editForm = document.createElement('div');
    editForm.className = 'title-edit-form';
    editForm.innerHTML = `
        <input type="text" id="titleInput" placeholder="输入新标题">
        <div class="buttons">
            <button onclick="saveTitle()">保存</button>
            <button class="cancel-btn" onclick="hideEditForm()">取消</button>
        </div>
    `;
    document.body.appendChild(editForm);

    // 添加右键菜单事件
    titleElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const form = document.querySelector('.title-edit-form');
        const input = document.getElementById('titleInput');
        input.value = pageTitle;
        
        form.style.display = 'block';
        adjustPopupPosition(form, e.pageX, e.pageY);
    });

    // 点击其他地方关闭表单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.title-edit-form') && !e.target.closest('.editable-title')) {
            hideEditForm();
        }
    });

    // 创建网站编辑表单
    createSiteEditForm();

    // 添加网站右键菜单事件委托
    document.addEventListener('contextmenu', (e) => {
        const siteLink = e.target.closest('.site-link');
        if (siteLink) {
            e.preventDefault();
            const siteIndex = parseInt(siteLink.dataset.siteIndex);
            showSiteEditForm(e.pageX, e.pageY, siteIndex);
        }
    });

    // 点击其他地方关闭所有表单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.title-edit-form') && 
            !e.target.closest('.editable-title') && 
            !e.target.closest('.site-edit-form') && 
            !e.target.closest('.site-link')) {
            hideEditForm();
            hideSiteEditForm();
        }
    });

    // 添加搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSites(e.target.value.toLowerCase());
        });
    }

    loadSites();

    // 版本检查
    async function checkVersion() {
        try {
            const response = await fetch('/api/version');
            const data = await response.json();
            console.log(`当前版本: ${data.version}`);
            
            // 检查本地存储的版本
            const localVersion = localStorage.getItem('version');
            if (localVersion !== data.version) {
                console.log('检测到新版本，正在更新...');
                localStorage.setItem('version', data.version);
                // 可以在这里添加版本更新提示或其他操作
            }
        } catch (error) {
            console.error('版本检查失败:', error);
        }
    }

    checkVersion();
});

// 保存标题
async function saveTitle() {
    const input = document.getElementById('titleInput');
    const newTitle = input.value.trim();
    if (newTitle) {
        pageTitle = newTitle;
        document.getElementById('mainTitle').textContent = newTitle;
        await saveSites();
    }
    hideEditForm();
}

// 隐藏编辑表单
function hideEditForm() {
    document.querySelector('.title-edit-form').style.display = 'none';
}

function showSiteEditForm(x, y, siteIndex) {
    currentEditingSiteIndex = siteIndex;
    const site = sites[siteIndex];
    const form = document.querySelector('.site-edit-form');
    
    // 更新表单内容
    document.getElementById('siteEditName').value = site.name;
    document.getElementById('siteEditUrl').value = site.url;
    document.getElementById('siteEditDesc').value = site.description || '';
    
    // 更新分组下拉框
    const groupSelect = document.getElementById('siteEditGroup');
    groupSelect.innerHTML = `
        <option value="">未分组</option>
        ${groups.map((group, index) => `
            <option value="${index}" ${site.groupIndex === index ? 'selected' : ''}>
                ${group}
            </option>
        `).join('')}
    `;
    
    form.style.display = 'block';
    adjustPopupPosition(form, x, y);
}

function hideSiteEditForm() {
    document.querySelector('.site-edit-form').style.display = 'none';
    currentEditingSiteIndex = -1;
}

async function saveSiteEdit() {
    if (currentEditingSiteIndex === -1) return;
    
    const nameInput = document.getElementById('siteEditName');
    const urlInput = document.getElementById('siteEditUrl');
    const descInput = document.getElementById('siteEditDesc');
    const groupSelect = document.getElementById('siteEditGroup');
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const description = descInput.value.trim();
    const groupIndex = groupSelect.value ? parseInt(groupSelect.value) : undefined;
    
    if (!name || !url) {
        alert('请填写网站名称和地址！');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    sites[currentEditingSiteIndex] = {
        ...sites[currentEditingSiteIndex],
        name,
        url,
        description,
        groupIndex
    };
    
    await saveSites();
    displaySites();
    hideSiteEditForm();
}

async function confirmDelete() {
    if (currentEditingSiteIndex === -1) return;
    
    if (confirm('确定要删除这个网站吗？')) {
        sites.splice(currentEditingSiteIndex, 1);
        await saveSites();
        displaySites();
        hideSiteEditForm();
    }
}

// 添加新的全局变量
let currentEditingGroupIndex = -1;

// 创建组编辑表单
function createGroupEditForm() {
    const editForm = document.createElement('div');
    editForm.className = 'group-edit-form';
    editForm.innerHTML = `
        <input type="text" id="groupEditName" placeholder="分组名称">
        <div class="group-delete-options" style="display: none;">
            <p>删除选项：</p>
            <label>
                <input type="radio" name="deleteOption" value="keepSites" checked>
                保留网站（移至未分组）
            </label>
            <label>
                <input type="radio" name="deleteOption" value="deleteSites">
                同时删除组内网站
            </label>
        </div>
        <div class="buttons">
            <button class="delete-confirm" onclick="confirmDeleteGroup()">删除分组</button>
            <button onclick="saveGroupEdit()">保存</button>
            <button class="cancel-btn" onclick="hideGroupEditForm()">取消</button>
        </div>
    `;
    document.body.appendChild(editForm);
}

// 在 DOMContentLoaded 事件中添加组编辑相关的事件监听
document.addEventListener('DOMContentLoaded', () => {
    // ... 原有代码 ...

    createGroupEditForm();

    // 添加组右键菜单事件委托
    document.addEventListener('contextmenu', (e) => {
        const groupTitle = e.target.closest('.group-title');
        if (groupTitle) {
            e.preventDefault();
            const groupIndex = parseInt(groupTitle.dataset.groupIndex);
            showGroupEditForm(e.pageX, e.pageY, groupIndex);
        }
    });

    // 修改点击其他地方关闭表单的处理
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.title-edit-form') && 
            !e.target.closest('.editable-title') && 
            !e.target.closest('.site-edit-form') && 
            !e.target.closest('.site-link') &&
            !e.target.closest('.group-edit-form') && 
            !e.target.closest('.group-title')) {
            hideEditForm();
            hideSiteEditForm();
            hideGroupEditForm();
        }
    });
});

// 显示组编辑表单
function showGroupEditForm(x, y, groupIndex) {
    currentEditingGroupIndex = groupIndex;
    const form = document.querySelector('.group-edit-form');
    const deleteOptions = form.querySelector('.group-delete-options');
    
    document.getElementById('groupEditName').value = groups[groupIndex];
    deleteOptions.style.display = 'none';
    
    form.style.display = 'block';
    adjustPopupPosition(form, x, y);
}

// 隐藏组编辑表单
function hideGroupEditForm() {
    document.querySelector('.group-edit-form').style.display = 'none';
    currentEditingGroupIndex = -1;
}

// 保存组编辑
async function saveGroupEdit() {
    if (currentEditingGroupIndex === -1) return;
    
    const nameInput = document.getElementById('groupEditName');
    const newName = nameInput.value.trim();
    
    if (!newName) {
        alert('请输入分组名称！');
        return;
    }
    
    groups[currentEditingGroupIndex] = newName;
    await saveSites();
    displaySites();
    hideGroupEditForm();
}

// 确认删除组
async function confirmDeleteGroup() {
    if (currentEditingGroupIndex === -1) return;
    
    const form = document.querySelector('.group-edit-form');
    const deleteOptions = form.querySelector('.group-delete-options');
    deleteOptions.style.display = 'block';
    
    const confirmDelete = async () => {
        const deleteOption = document.querySelector('input[name="deleteOption"]:checked').value;
        
        if (deleteOption === 'keepSites') {
            // 将组内网站移至未分组
            sites = sites.map(site => {
                if (site.groupIndex === currentEditingGroupIndex) {
                    return { ...site, groupIndex: undefined };
                }
                if (site.groupIndex > currentEditingGroupIndex) {
                    return { ...site, groupIndex: site.groupIndex - 1 };
                }
                return site;
            });
        } else {
            // 删除组内网站
            sites = sites.filter(site => site.groupIndex !== currentEditingGroupIndex);
            // 更新其他网站的组索引
            sites = sites.map(site => {
                if (site.groupIndex > currentEditingGroupIndex) {
                    return { ...site, groupIndex: site.groupIndex - 1 };
                }
                return site;
            });
        }
        
        groups.splice(currentEditingGroupIndex, 1);
        await saveSites();
        displaySites();
        hideGroupEditForm();
    };
    
    // 只在第一次点击删除时显示选项
    if (deleteOptions.style.display === 'none') {
        deleteOptions.style.display = 'block';
    } else {
        confirmDelete();
    }
}

// 添加拖拽相关函数
function addDragListeners() {
    const groupContainers = document.querySelectorAll('.group-container');
    
    groupContainers.forEach(container => {
        container.addEventListener('dragstart', handleDragStart);
        container.addEventListener('dragend', handleDragEnd);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    this.classList.add('dragging');
    e.dataTransfer.setData('text/plain', this.dataset.groupIndex);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.group-container').forEach(container => {
        container.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(this.dataset.groupIndex);
    
    if (fromIndex === toIndex) return;
    
    // 重新排序分组
    const [movedGroup] = groups.splice(fromIndex, 1);
    groups.splice(toIndex, 0, movedGroup);
    
    // 更新网站的分组索引
    sites = sites.map(site => {
        if (site.groupIndex === fromIndex) {
            return { ...site, groupIndex: toIndex };
        }
        if (fromIndex < toIndex && site.groupIndex > fromIndex && site.groupIndex <= toIndex) {
            return { ...site, groupIndex: site.groupIndex - 1 };
        }
        if (fromIndex > toIndex && site.groupIndex >= toIndex && site.groupIndex < fromIndex) {
            return { ...site, groupIndex: site.groupIndex + 1 };
        }
        return site;
    });
    
    await saveSites();
    displaySites();
}

// 添加搜索功能
function addSearchBar() {
    const searchHTML = `
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="搜索网站...">
        </div>
    `;
    document.querySelector('.title-container').insertAdjacentHTML('afterend', searchHTML);
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterSites(searchTerm);
    });
}

// 添加导入导出功能
async function exportData(format = 'json') {
    showToast('正在准备导出...', 'info');
    try {
        const data = {
            sites,
            groups,
            pageTitle,
            exportDate: new Date().toISOString()
        };
        
        let exportContent;
        let mimeType;
        let fileExt;
        
        switch (format) {
            case 'csv':
                exportContent = sitesToCSV(data.sites);
                mimeType = 'text/csv';
                fileExt = 'csv';
                break;
            case 'markdown':
                exportContent = sitesToMarkdown(data);
                mimeType = 'text/markdown';
                fileExt = 'md';
                break;
            default:
                exportContent = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                fileExt = 'json';
        }
        
        const blob = new Blob([exportContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `navigation_backup_${new Date().toISOString().split('T')[0]}.${fileExt}`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('导出成功！', 'success');
    } catch (error) {
        showToast('导出失败：' + error.message, 'error');
    }
}

function sitesToCSV(sites) {
    const headers = ['名称', '地址', '描述', '分组', '标签', '访问次数'];
    const rows = sites.map(site => [
        site.name,
        site.url,
        site.description || '',
        groups[site.groupIndex] || '未分组',
        (site.tags || []).join(';'),
        site.stats?.visitCount || 0
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

function sitesToMarkdown(data) {
    let md = `# ${data.pageTitle}\n\n`;
    
    // 按分组整理网站
    const groupedSites = {};
    data.sites.forEach(site => {
        const groupName = site.groupIndex !== undefined ? 
            data.groups[site.groupIndex] : '未分组';
        if (!groupedSites[groupName]) {
            groupedSites[groupName] = [];
        }
        groupedSites[groupName].push(site);
    });
    
    // 生成Markdown内容
    Object.entries(groupedSites).forEach(([groupName, sites]) => {
        md += `## ${groupName}\n\n`;
        sites.forEach(site => {
            md += `- [${site.name}](${site.url})`;
            if (site.description) {
                md += ` - ${site.description}`;
            }
            if (site.tags && site.tags.length > 0) {
                md += ` [${site.tags.join(', ')}]`;
            }
            md += '\n';
        });
        md += '\n';
    });
    
    return md;
}

// 添加本地缓存
function cacheData() {
    localStorage.setItem('navigationData', JSON.stringify({
        sites,
        groups,
        pageTitle,
        timestamp: Date.now()
    }));
}

// 从缓存加载
async function loadFromCache() {
    const cached = localStorage.getItem('navigationData');
    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 300000) { // 5分钟缓存
            return data;
        }
    }
    return null;
}

// 添加延迟加载功能
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// 添加URL验证
function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 添加XSS防护
function sanitizeInput(input) {
    return input.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

// 在现有代码的适当位置添加搜索功能
function filterSites(searchTerm) {
    const siteElements = document.querySelectorAll('.site-item');
    siteElements.forEach(element => {
        const siteLink = element.querySelector('.site-link');
        const siteName = siteLink.textContent.toLowerCase();
        const siteUrl = siteLink.href.toLowerCase();
        
        if (siteName.includes(searchTerm) || siteUrl.includes(searchTerm)) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    });
}

// 添加菜单切换功能
function toggleMenu() {
    const menuButtons = document.querySelector('.menu-buttons');
    const menuToggle = document.querySelector('.menu-toggle');
    menuButtons.classList.toggle('show');
    menuToggle.classList.toggle('active');
}

// 点击其他地方关闭菜单
document.addEventListener('click', (e) => {
    if (!e.target.closest('.floating-buttons')) {
        const menuButtons = document.querySelector('.menu-buttons');
        const menuToggle = document.querySelector('.menu-toggle');
        menuButtons.classList.remove('show');
        menuToggle.classList.remove('active');
    }
});

// 导入数据功能
async function importData(event) {
    showToast('正在导入...', 'info');
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const content = await file.text();
        const data = JSON.parse(content);
        
        // 数据格式验证
        if (!isValidImportData(data)) {
            throw new Error('数据格式不正确');
        }
        
        sites = data.sites;
        groups = data.groups || [];
        pageTitle = data.title || "我的网站导航";
        
        // 清理导入的数据
        cleanupSites();
        
        await saveSites();
        displaySites();
        document.getElementById('mainTitle').textContent = pageTitle;
        
        showToast(`成功导入 ${data.sites.length} 个网站`, 'success');
    } catch (error) {
        showToast('导入失败：' + error.message, 'error');
    } finally {
        event.target.value = ''; // 清空文件选择
    }
}

function isValidImportData(data) {
    // 基本结构检查
    if (!data || !Array.isArray(data.sites)) {
        return false;
    }
    
    // 网站数据检查
    return data.sites.every(site => {
        return site.name && 
                site.url && 
                typeof site.url === 'string' &&
                (!site.groupIndex || Number.isInteger(site.groupIndex));
    });
}

// 修改快捷键监听
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + / 显示快捷键帮助
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showShortcutsHelp();
    }
    
    // Alt + S 聚焦搜索框
    if (e.key === 's' && e.altKey) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Alt + N 添加新网站
    if (e.key === 'n' && e.altKey) {
        e.preventDefault();
        toggleAddForm();
    }
    
    // Alt + G 添加新分组
    if (e.key === 'g' && e.altKey) {
        e.preventDefault();
        showAddGroupForm();
    }
    
    // Esc 关闭所有弹出层
    if (e.key === 'Escape') {
        hideAddForm();
        hideAddGroupForm();
        hideSiteEditForm();
        hideEditForm();
    }
});

// 更新快捷键帮助显示
function showShortcutsHelp() {
    const helpHTML = `
        <div class="shortcuts-help modal-center">
            <h3>键盘快捷键</h3>
            <ul>
                <li><kbd>Ctrl/⌘</kbd> + <kbd>/</kbd> 显示此帮助</li>
                <li><kbd>Alt</kbd> + <kbd>S</kbd> 搜索</li>
                <li><kbd>Alt</kbd> + <kbd>N</kbd> 添加网站</li>
                <li><kbd>Alt</kbd> + <kbd>G</kbd> 添加分组</li>
                <li><kbd>Esc</kbd> 关闭弹出层</li>
            </ul>
            <button onclick="closeShortcutsHelp()">关闭</button>
        </div>
        <div class="modal-overlay" onclick="closeShortcutsHelp()"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', helpHTML);
}

// 添加关闭快捷键帮助的函数
function closeShortcutsHelp() {
    const helpDialog = document.querySelector('.shortcuts-help');
    const overlay = document.querySelector('.modal-overlay');
    if (helpDialog) helpDialog.remove();
    if (overlay) overlay.remove();
}

// 修改访问统计功能
function trackSiteVisit(siteIndex) {
    const site = sites[siteIndex];
    // 只记录访问次数和最后访问时间
    if (!site.stats) {
        site.stats = {
            visitCount: 0,
            lastVisit: null
        };
    }
    
    site.stats.visitCount++;
    site.stats.lastVisit = new Date().toISOString();
    
    saveSites();
}

// 数据迁移函数
function migrateVisitData() {
    sites.forEach(site => {
        if (site.visits && Array.isArray(site.visits)) {
            site.stats = {
                visitCount: site.visits.length,
                lastVisit: site.visits[site.visits.length - 1]
            };
            delete site.visits; // 删除旧的访问记录
        }
    });
    saveSites();
}

// 添加一个通用的弹窗位置调整函数
function adjustPopupPosition(popup, clickX, clickY) {
    // 获取视窗大小
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取弹窗大小
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;
    
    // 计算理想位置
    let left = clickX;
    let top = clickY;
    
    // 检查右边界
    if (left + popupWidth > viewportWidth - 10) {
        left = viewportWidth - popupWidth - 10;
    }
    
    // 检查下边界
    if (top + popupHeight > viewportHeight - 10) {
        top = viewportHeight - popupHeight - 10;
    }
    
    // 确保不超出左上边界
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    // 应用位置
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

// 主题切换相关函数
function toggleThemeMenu() {
    const themeMenu = document.getElementById('themeMenu');
    themeMenu.classList.toggle('show');
    event.stopPropagation();
}

function setTheme(theme) {
    // 移除旧的主题类
    document.body.classList.remove('theme-light', 'theme-dark');
    
    // 保存主题设置
    localStorage.setItem('preferred-theme', theme);
    
    if (theme === 'system') {
        // 移除强制主题
        document.body.removeAttribute('data-theme');
    } else {
        // 设置新主题
        document.body.setAttribute('data-theme', theme);
        document.body.classList.add(`theme-${theme}`);
    }
    
    // 关闭主题菜单
    document.getElementById('themeMenu').classList.remove('show');
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('preferred-theme') || 'system';
    setTheme(savedTheme);
}

// 在页面加载时初始化主题
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // 点击其他地方关闭主题菜单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.theme-menu') && !e.target.closest('.theme-toggle')) {
            document.getElementById('themeMenu').classList.remove('show');
        }
    });
});

/**
 * 自动获取网站favicon
 * @param {string} url - 网站地址
 * @returns {string} 图标URL
 */
async function getFavicon(url) {
    // const cachedIcon = getCachedFavicon(url);
    // if (cachedIcon) {
    //     return cachedIcon;
    // }
    
    let iconUrl = '/icons/default-icon.png';
    let retries = 0;
    const maxRetries = 5; // 简化重试次数
    const domain = new URL(url).hostname;
    
    while (retries < maxRetries) {
        try {
            // 尝试使用 Google Favicon 服务
            iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            const response = await fetch(iconUrl, { mode: 'no-cors' });
            if (response.ok) {
                if (response.status === 404) {
                    console.warn(`Google Favicon 服务返回 404 错误: ${iconUrl}`);
                    return '/icons/default-icon.png'; // 返回默认图标
                }
                // cacheFavicon(url, iconUrl);
                console.log(`成功获取 Google Favicon: ${iconUrl}`);
                return iconUrl;
            }
            
            retries++;
            console.warn(`Google Favicon 服务失败，重试第 ${retries} 次: ${response.status}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // 延迟重试
        } catch (error) {
            console.error('Google Favicon 服务请求失败:', error);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 500)); // 延迟重试
        }
    }
    
    // 移除备用服务
    // try {
    //     iconUrl = `https://api.faviconkit.com/${domain}/32`;
    //     const response = await fetch(iconUrl);
    //     if (response.ok) {
    //         // cacheFavicon(url, iconUrl);
    //         console.log(`成功获取备用 Favicon: ${iconUrl}`);
    //         return iconUrl;
    //     }
    //     console.warn(`备用 Favicon 服务失败: ${response.status}`);
    // } catch (error) {
    //     console.error('备用 Favicon 服务请求失败:', error);
    // }
    
    console.warn('所有 Favicon 服务均失败，使用默认图标');
    return iconUrl;
}

// 从缓存中获取 favicon
// function getCachedFavicon(url) {
//     const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || '{}');
//     const cached = cache[url];
//     if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
//         return cached.iconUrl;
//     }
//     return null;
// }

// 缓存 favicon
// function cacheFavicon(url, iconUrl) {
//     const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || '{}');
//     cache[url] = {
//         iconUrl,
//         timestamp: Date.now()
//     };
//     localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
// }

// 添加标签相关函数
function addTag(siteIndex, tag) {
    const site = sites[siteIndex];
    if (!site.tags) {
        site.tags = [];
    }
    if (!site.tags.includes(tag)) {
        site.tags.push(tag);
        saveSites();
        displaySites();
    }
}

function removeTag(siteIndex, tag) {
    const site = sites[siteIndex];
    if (site.tags) {
        site.tags = site.tags.filter(t => t !== tag);
        saveSites();
        displaySites();
    }
}

function renderTags(site) {
    if (!site.tags || site.tags.length === 0) return '';
    
    return `
        <div class="site-tags">
            ${site.tags.map(tag => `
                <span class="tag" style="background-color: ${getTagColor(tag)}">
                    ${tag}
                    <span class="tag-remove" onclick="removeTag(${sites.indexOf(site)}, '${tag}')">×</span>
                </span>
            `).join('')}
        </div>
    `;
}

function getTagColor(tag) {
    const tagColors = {
        '开发': '#4CAF50',
        '工具': '#2196F3',
        '文档': '#FF9800',
        '娱乐': '#9C27B0',
        '学习': '#E91E63'
    };
    return tagColors[tag] || '#757575';
}

// 添加提示组件
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 支持多条消息堆叠显示
    const container = document.querySelector('.toast-container') || 
        (() => {
            const c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
            return c;
        })();
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 数据清理和去重
function cleanupSites() {
    // 1. 先进行数据修复
    sites = sites.map(site => {
        // 修复URL格式
        if (site.url && !site.url.startsWith('http')) {
            site.url = 'https://' + site.url;
        }
        return site;
    });

    // 2. 再进行数据验证和去重
    const seen = new Set();
    const validSites = sites.filter(site => {
        // 基本验证
        if (!site.name || !site.url) return false;
        
        // 格式验证
        if (!Validator.siteName(site.name) || !Validator.url(site.url)) {
            console.log(`清理无效数据: ${site.name} - ${site.url}`);
            return false;
        }
        
        // 去重检查（只对相同分组的相同URL去重）
        const key = `${site.url}-${site.groupIndex}`;
        if (seen.has(key)) {
            console.log(`清理重复数据: ${site.name} - ${site.url}`);
            return false;
        }
        seen.add(key);
        return true;
    });

    // 3. 如果有变化，保存并提示
    if (validSites.length !== sites.length) {
        const removedCount = sites.length - validSites.length;
        sites = validSites;
        saveSites();
        showToast(`已清理 ${removedCount} 个无效或重复的网站`, 'info');
        return true; // 返回是否进行了清理
    }
    return false;
}

// 统一的错误处理
function handleError(error, operation = '操作') {
    console.error(`${operation}失败:`, error);
    showToast(`${operation}失败：${error.message || '请检查网络连接'}`, 'error');
}

// 输入验证
function validateSiteInput(name, url, description) {
    if (!name.trim()) {
        throw new Error('网站名称不能为空');
    }
    
    try {
        new URL(url.startsWith('http') ? url : 'https://' + url);
    } catch {
        throw new Error('请输入有效的网址');
    }
    
    return {
        name: name.trim(),
        url: url.trim(),
        description: description.trim()
    };
}

// 添加自动备份功能
function autoBackup() {
    const backup = {
        timestamp: new Date().toISOString(),
        data: {
            sites,
            groups,
            title: pageTitle
        }
    };
    
    try {
        const backups = JSON.parse(localStorage.getItem('site_backups') || '[]');
        backups.push(backup);
        
        // 只保留最近5个备份
        while (backups.length > 5) {
            backups.shift();
        }
        
        localStorage.setItem('site_backups', JSON.stringify(backups));
        console.log('自动备份完成:', backup.timestamp);
    } catch (error) {
        console.error('自动备份失败:', error);
    }
}

// 在关键操作后触发备份
['addSite', 'deleteSite', 'cleanupSites', 'addGroup', 'importData']
.forEach(funcName => {
    const originalFunc = window[funcName];
    window[funcName] = async function(...args) {
        const result = await originalFunc.apply(this, args);
        autoBackup();
        return result;
    };
}); 