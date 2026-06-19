const { contextBridge, ipcRenderer, webUtils} = require('electron');

contextBridge.exposeInMainWorld('myApi', {
    openSite: (site) => ipcRenderer.send('open:site', site),
    getGroupMenus: () => ipcRenderer.invoke('get:groupMenus'),
    getGroups: () => ipcRenderer.invoke('get:groups'),
    getFilePath: (file) => webUtils.getPathForFile(file),


});