let sites = [];
let groups = [];
let pageTitle = "我的网站导航";

// 从服务器获取数据
async function loadSites() {
    try {
        const response = await fetch('http://localhost:3000/api/sites');
        const data = await response.json();
        sites = data.sites || [];
        groups = data.groups || [];
        pageTitle = data.title || "我的网站导航";
        updateGroupSelect();
        displaySites();
        document.getElementById('mainTitle').textContent = pageTitle;
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请检查服务器是否运行');
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

// 添加网站
async function addSite() {
    const nameInput = document.getElementById('siteName');
    const urlInput = document.getElementById('siteUrl');
    const descInput = document.getElementById('siteDesc');
    const groupSelect = document.getElementById('groupSelect');
    
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
    
    sites.push({ 
        name, 
        url, 
        description, 
        groupIndex 
    });
    
    await saveSites();
    
    nameInput.value = '';
    urlInput.value = '';
    descInput.value = '';
    toggleAddForm();
    displaySites();
}

// 删除网站
async function deleteSite(index) {
    sites.splice(index, 1);
    await saveSites();
    displaySites();
}

// 显示网站列表
function displaySites() {
    const sitesList = document.getElementById('sitesList');
    sitesList.innerHTML = '';
    
    // 显示未分组的网站
    const ungroupedSites = sites.filter(site => site.groupIndex === undefined || site.groupIndex === null);
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
        sitesList.appendChild(ungroupedContainer);
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
            sitesList.appendChild(groupContainer);
        }
    });

    addDragListeners();
}

// 创建网站元素的辅助函数
function createSiteElement(site) {
        const siteElement = document.createElement('div');
        siteElement.className = 'site-item';
        siteElement.innerHTML = `
        <a href="${site.url}" target="_blank" class="site-link" data-site-index="${sites.indexOf(site)}">
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
        
        // 设置表单位置
        form.style.display = 'block';
        form.style.left = e.pageX + 'px';
        form.style.top = e.pageY + 'px';
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

    loadSites();
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
    form.style.left = x + 'px';
    form.style.top = y + 'px';
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
    form.style.left = x + 'px';
    form.style.top = y + 'px';
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