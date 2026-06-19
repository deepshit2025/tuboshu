import path from 'path'
import { app } from 'electron'
import {initDatabase} from './store/database.js'
import tbsDbManager from './store/tbsDbManager.js'
import windowManager from './windowManager.js'
import trayManager from'./trayManager.js'
import shortcutManager from './shortcut/shortcutManager.js'
import contextManager from "./context/contextManager.js"
import AutoLaunch from "./utility/autoLaunch.js"

// app.disableHardwareAcceleration();
//app.commandLine.appendSwitch('disable-gpu');
//app.commandLine.appendSwitch('disable-webrtc');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-certificate-errors');

app.commandLine.appendSwitch('lang', 'zh-CN');

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process')

if(process.env.PORTABLE_EXECUTABLE_DIR){
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'tuboshu-user-data'))
}

app.isQuitting = false;
app.isMac = (process.platform === 'darwin');
app.singleLock = app.requestSingleInstanceLock();

app.whenReady().then(async () => {
  if (!app.singleLock) return app.quit();

  // 先初始化数据库
  await initDatabase(path.join(app.getPath('userData'), 'tuboshu.db'))
  await tbsDbManager.init()

  windowManager.createWindow();
  trayManager.createTray();
  shortcutManager.initShortcuts();
  contextManager.createContextMenu();
  AutoLaunch.initAutoLaunch();
})


app.on('before-quit', () => {
  app.isQuitting = true;
  const win = windowManager.getWindow();
  if (win && !win.isDestroyed()) {
    win.close();
  }
});
app.on('will-quit', () => {
  shortcutManager.unregisterAll();
  trayManager.destroyTray();
})

app.on('window-all-closed', () => {
  if (app.isMac) app.dock.hide();
  else app.quit();
})

app.on('activate', () => {
  if (!windowManager.getWindow()) {
    windowManager.createWindow();
  }else{
    windowManager.getWindow().show();
  }
})


app.on('second-instance', () => {
  windowManager.getWindow()?.show();
})

app.on('render-process-gone', (event, webContents, details) => {
  if (details.reason === 'crashed') {
    windowManager.getMenuView().webContents.reload();
  }
});

// 添加进程异常处理
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error)
})

process.on('uncaughtException', (err) => {
  console.error('主进程崩溃:', err);
});