const { contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('myApi', {
    exportConfig: () => ipcRenderer.invoke('export:config'),
    importConfig: () => ipcRenderer.invoke('import:config'),
    getConfig: () => ipcRenderer.invoke('get:menu'),
    getShortcuts: () => ipcRenderer.invoke('get:shortcuts'),
    getVersion: () => ipcRenderer.invoke('get:version'),
    getSettings: () => ipcRenderer.invoke('get:settings'),
    getFavicon: (name) => ipcRenderer.invoke('get:favicon', name),
    openSite: (site) => ipcRenderer.send('open:site', site),
    getGroupMenus: () => ipcRenderer.invoke('get:groupMenus'),
    getGroups: () => ipcRenderer.invoke('get:groups'),
    updateGroup: (group) => ipcRenderer.invoke('update:group', group),
    removeGroup: (group) => ipcRenderer.invoke('remove:group', group),

    updateShortcut: (shortcut) => ipcRenderer.invoke('update:shortcut', shortcut),
    updateMenu: (menu) => ipcRenderer.send('update:menu', menu),
    batchMenus: (menus) => ipcRenderer.invoke('batch:menus', menus),
    addMenu: (menu) => ipcRenderer.send('add:menu', menu),
    removeMenu: (menu) => ipcRenderer.send('remove:menu', menu),
    updateSetting: (setting) => ipcRenderer.send('update:setting', setting),

    clearCache: () => ipcRenderer.invoke('dataSync:clear:cache'),
    getAppConfig: () => ipcRenderer.invoke('dataSync:get:data'),
    restoreAppConfig: (data) => ipcRenderer.send('dataSync:get:data', data),

    // 文本
    getClipboardHistory: (keyword, favoritesOnly) => ipcRenderer.invoke('clipboard:history', keyword, favoritesOnly),
    clearClipboardHistory: () => ipcRenderer.invoke('clipboard:clear'),
    clearClipboardPinned: () => ipcRenderer.invoke('clipboard:clear:pinned'),
    clearClipboardFavorites: () => ipcRenderer.invoke('clipboard:clear:favorites'),
    clearClipboardNormal: () => ipcRenderer.invoke('clipboard:clear:normal'),
    deleteClipboardRecord: (id) => ipcRenderer.invoke('clipboard:delete', id),

    // 置顶 / 收藏
    togglePin: (id) => ipcRenderer.invoke('clipboard:pin:toggle', id),
    toggleFavorite: (id) => ipcRenderer.invoke('clipboard:favorite:toggle', id),

    // 图片
    getClipboardImages: () => ipcRenderer.invoke('clipboard:images'),
    deleteClipboardImage: (id) => ipcRenderer.invoke('clipboard:image:delete', id),
    clearClipboardImages: () => ipcRenderer.invoke('clipboard:images:clear'),

    // 文件
    getClipboardFiles: () => ipcRenderer.invoke('clipboard:files'),
    deleteClipboardFile: (id) => ipcRenderer.invoke('clipboard:file:delete', id),
    clearClipboardFiles: () => ipcRenderer.invoke('clipboard:files:clear'),

    toggleClipboardWatch: (enabled) => ipcRenderer.invoke('clipboard:toggle', enabled),

    // 复制图片到系统剪贴板
    copyClipboardImage: (filePath) => ipcRenderer.invoke('clipboard:image:copy', filePath),
    // 新增：用系统默认程序打开文件
    openClipboardFile: (filePath) => ipcRenderer.invoke('clipboard:file:open', filePath),
    // 新增：在默认浏览器中打开链接
    openLinkInBrowser: (url) => ipcRenderer.invoke('clipboard:url:open', url),

    // 插件市场
    getPlugins: () => ipcRenderer.invoke('get:plugins'),
    togglePlugin: (id, enabled) => ipcRenderer.invoke('toggle:plugin', { id, enabled }),
    installLocalPlugin: () => ipcRenderer.invoke('install:local-plugin'),
    uninstallPlugin: (id) => ipcRenderer.invoke('uninstall:plugin', id),
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selectionText = window.getSelection().toString().trim();
    const data = {x: e.clientX, y: e.clientY};
    if (selectionText) {
        ipcRenderer.send('copy:text', selectionText)
        ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:3}))
        return;
    }

    const isInputElement = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
    const isContentEditable = e.target.isContentEditable;
    if(isInputElement || isContentEditable){
        ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:5}))
        return;
    }

    ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:1}))
});
