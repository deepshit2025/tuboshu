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

    // 剪贴板历史
    getClipboardHistory: (keyword) => ipcRenderer.invoke('clipboard:history', keyword),
    clearClipboardHistory: () => ipcRenderer.invoke('clipboard:clear'),
    deleteClipboardRecord: (id) => ipcRenderer.invoke('clipboard:delete', id),
    toggleClipboardWatch: (enabled) => ipcRenderer.invoke('clipboard:toggle', enabled),
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