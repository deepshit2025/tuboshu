import { app, clipboard, screen} from 'electron'
import windowManager from '../windowManager.js'
import trayManager from '../trayManager.js'
import viewManager from '../viewManager.js'
import tbsDbManager from '../store/tbsDbManager.js'
import storeManager from '../store/storeManager.js'
import eventManager from '../eventManager.js'
import shortcutBase from './shortcutBase.js'
import Layout from '../utility/layout.js'
import CONS from '../constants.js'


// 在 Electron 中，你可以通过简单的字符串组合来定义一系列的快捷键。
// 这些字符串是由一个或多个由加号(+)连接的修饰键和一个键（key）组成。
// 修饰键包括 Command (或 Cmd 代表 macOS 的 Command 键),
// Control (或 Ctrl), CommandOrControl (或 CmdOrCtrl), Alt, 和 Shift。
// 键可以是单个字符（比如 A 到 Z）,数字 (0 到 9),功能键 (F1 到 F24),
// 或其他特殊键 (Backspace, Tab, Enter, Esc 等)。
// 组合快捷键的时候，按照下面的方式去写：
// 复制：CommandOrControl+C
// 粘贴：CommandOrControl+V
// 剪切：CommandOrControl+X
// 撤销：CommandOrControl+Z
// 重做：CommandOrControl+Shift+Z 或 CommandOrControl+Y
// 保存：CommandOrControl+S
// 新建：CommandOrControl+N
// 打开：CommandOrControl+O
// 关闭当前窗口：CommandOrControl+W
// 你也可以组合多个修饰键：
// 示例：CommandOrControl+Shift+Option+J (在 macOS 上 Option 是 Alt 键)

class ShortcutManager{

    constructor() {}

    initShortcuts(){
        this.resetShortcutsData();
        tbsDbManager.getShortcuts().forEach((shortcut) => {
            if(!shortcut.isOpen){
                return;
            }
            if(!shortcutBase.isRegistered(shortcut.cmd)){
                shortcutBase.register(shortcut.cmd, this[shortcut.name].bind(this), shortcut.isGlobal)
            }
        })
        eventManager.on('replace:shortcut', (data, resolve) => {
            if(data.shortcut.flag === true){
                const res = this.isDisableShortcuts(data.shortcut)
                delete data.shortcut.flag;
                resolve(res);
            }else{
                const res =this.updateShortcut(data.shortcut, data.oldShortcut);
                delete data.shortcut.flag;
                resolve(res);
            }
        });
        this.openTransferSite();
        this.forceSystemExit();
    }

    isDisableShortcuts(shortcut){
        //禁用快捷键
        if(!shortcut.isOpen && shortcutBase.isRegistered(shortcut.cmd)){
            shortcutBase.unregister(shortcut.cmd)
            return true;
        }

        //启用快捷键
        if(shortcut.isOpen && !shortcutBase.isRegistered(shortcut.cmd)){
            shortcutBase.register(shortcut.cmd, this[shortcut.name].bind(this))
            return true;
        }
        return true;
    }

    updateShortcut(shortcut, oldShortcut){
        if(shortcutBase.isRegistered(shortcut.cmd)){
            return false;
        }

        shortcutBase.unregister(oldShortcut.cmd)
        shortcutBase.register(shortcut.cmd, this[shortcut.name].bind(this), shortcut.isGlobal)
        return true;
    }

    softwareExit(){
        trayManager.reallyQuitApp();
    }

    softwareWindowVisibilityController(){
        trayManager.toggleWindow();
    }
    softwareSetting(){
        trayManager.autoClickSettings()
    }

    windowTopmostToggle(){
        let win = windowManager.getWindow();
        win.isAlwaysOnTop() ? win.setAlwaysOnTop(false) : win.setAlwaysOnTop(true);
    }

    softwareSiteSwitch(){
        const view = viewManager.getActiveView();
        const menuView = windowManager.getMenuView();
        menuView.webContents.focus();

        const openMenus = tbsDbManager.getGroupMenus().openMenus;
        let idx = openMenus.findIndex(item => item.name === view.name);
        if(openMenus.length === (idx+1))  idx= -1;
        menuView.webContents.send('auto:click', openMenus[idx+1]);
    }

    groupSiteSwitch(){
        const menuView = windowManager.getMenuView();
        menuView.webContents.focus();

        const groups = tbsDbManager.getGroups();
        if(groups.length === 0) return;

        let idx = groups.findIndex(item => item.isOpen === true);
        if(groups.length === (idx+1)) {
            tbsDbManager.resetGroup();
        }else{
            tbsDbManager.updateGroup({name:groups[idx+1].name, isOpen:true})
        }
        menuView.webContents.reload();
    }

    restoreDefaultWindow(){
        let win = windowManager.getWindow()
        if (storeManager.getSetting('isFullScreen')) {
            win.maximize();
            return;
        }
        const [width, height] = win.getSize();
        const origin = Layout.getWinSize();

        if(width === origin.width && height === origin.height){
            win.maximize();
        }else{
            if(win.isMaximized()) win.unmaximize();
            if(!win.isVisible()) win.show();
            win.setSize(origin.width, origin.height, true);
            win.center();
        }
    }

    currentPageRefresher(){
        const view = viewManager.getActiveView();
        if(view) view.object.webContents.reload();
    }

    reloadHomepage(){
        viewManager.refreshActiveView()
    }

    windowMinimize(){
        let win = windowManager.getWindow();
        if(win.isMaximized()) win.unmaximize();
        win.isMinimized() ? win.restore() : win.minimize();
    }

    windowMaximizer(){
        let win = windowManager.getWindow();
        win.isMaximized() ? win.restore() : win.maximize();
    }

    leftScreenMiniWindow(){
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        let win = windowManager.getWindow();

        if(win.isMaximized()) win.unmaximize();
        if(!win.isVisible()) win.show();
        win.setBounds({x:0, y:0, width:width/3, height:height})
    }

    rightScreenMiniWindow(){
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        let win = windowManager.getWindow();

        if(win.isMaximized()) win.unmaximize();
        if(!win.isVisible()) win.show();
        let winWidth = width/3;
        win.setBounds({x:width-winWidth, y:0, width:winWidth, height:height})
    }

    getCurrentPageUrl(){
        const url =  viewManager.getActiveView().object.webContents.getURL();
        clipboard.writeText(url);
    }

    isMenuVisible(){
        // 诊断弹窗：验证 Ctrl+B 是否被捕获
        const { dialog } = require('electron');
        dialog.showMessageBox({ message: 'Ctrl+B 已触发！isMenuVisible=' + storeManager.getSetting('isMenuVisible'), title: '诊断' });
        if(storeManager.getSetting('isMenuVisible')){
            storeManager.set('isMenuVisible', 0);
        }else{
            storeManager.set('isMenuVisible', 1);
        }
        windowManager.handleResize();
    }

    resetShortcutsData(){
        CONS.SHORTCUT.forEach(item => {
            const shortCut = tbsDbManager.getShortcut(item.name);
            if(!shortCut){
                tbsDbManager.addShortcut(item);
            }else{
                if(!shortCut.hasOwnProperty('isGlobal')){
                    shortCut.isGlobal = item.isGlobal;
                    tbsDbManager.updateShortcut(shortCut);
                }
            }
        })
    }

    openTransferSite(){
        shortcutBase.register('CommandOrControl+Shift+B', () => {
            windowManager.afterCloseSitePage();
        });
    }

    forceSystemExit(){
        shortcutBase.register('CommandOrControl+Shift+Q', () => {
            app.exit()
        });
    }

    unregisterAll(){
        this.destroy();
    }

    destroy(){
        shortcutBase.unregisterAll();
    }
}

export default new ShortcutManager();