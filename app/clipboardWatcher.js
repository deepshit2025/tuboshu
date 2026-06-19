import { clipboard, ipcMain } from 'electron'
import tbsDbManager from './store/tbsDbManager.js'
import storeManager from './store/storeManager.js'

class ClipboardWatcher {
  constructor() {
    this._timer = null
    this._lastContent = ''
  }

  /**
   * 启动轮询（仅在启用状态下运行）
   */
  start() {
    this.stop()
    this._lastContent = tbsDbManager.getLastClipboardContent()
    this._poll()
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  _poll() {
    // 每 2 秒检查一次剪贴板
    this._timer = setInterval(() => {
      if (!storeManager.getSetting('clipboardWatchEnabled')) {
        // 如果用户关闭了开关，停止轮询
        this.stop()
        return
      }
      try {
        const text = clipboard.readText()
        if (text && text !== this._lastContent) {
          this._lastContent = text
          tbsDbManager.addClipboardRecord(text)
        }
      } catch {
        // 剪贴板读取失败时静默忽略
      }
    }, 2000)
  }

  bindIpcMain() {
    // 获取剪贴板历史
    ipcMain.handle('clipboard:history', async (event, keyword) => {
      return tbsDbManager.getClipboardHistory(keyword)
    })

    // 清空剪贴板历史
    ipcMain.handle('clipboard:clear', async () => {
      tbsDbManager.clearClipboardHistory()
      this._lastContent = ''
    })

    // 开关剪贴板监控
    ipcMain.handle('clipboard:toggle', async (event, enabled) => {
      storeManager.set('clipboardWatchEnabled', enabled ? 1 : 0)
      if (enabled) {
        this.start()
      } else {
        this.stop()
        this._lastContent = ''
      }
      return true
    })
  }
}

export default new ClipboardWatcher()
