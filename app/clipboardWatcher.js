import { clipboard, ipcMain, nativeImage, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import tbsDbManager from './store/tbsDbManager.js'
import storeManager from './store/storeManager.js'
import { initClipboardDirs, saveImage, saveFile, deleteFile, readFileAsDataUrl } from './clipboardStorage.js'

class ClipboardWatcher {
  constructor() {
    this._timer = null
    this._lastText = ''
    this._lastImageHash = ''
  }

  async start() {
    this.stop()
    await initClipboardDirs()
    this._lastText = tbsDbManager.getLastClipboardContent()
    this._poll()
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  async _getNextId(tableType) {
    const db = tbsDbManager
    if (tableType === 'image') {
      const list = db.getClipboardImages()
      return list.length > 0 ? list[0].id + 1 : 1
    }
    const list = db.getClipboardFiles()
    return list.length > 0 ? list[0].id + 1 : 1
  }

  _poll() {
    this._timer = setInterval(async () => {
      if (!storeManager.getSetting('clipboardWatchEnabled')) {
        this.stop()
        return
      }
      try {
        const formats = clipboard.availableFormats('clipboard')

        // 1. 检测文本（最常见，优先处理）
        const hasText = formats.some(f => f.startsWith('text/'))
        if (hasText) {
          let text = clipboard.readText()
          if (text) {
            text = text.trim()
            if (text && text !== this._lastText) {
              this._lastText = text
              const existing = tbsDbManager.findClipboardByContent(text)
              if (!existing) {
                tbsDbManager.addClipboardRecord(text)
              }
            }
          }
        }

        // 2. 检测图片（仅当没有文本时）
        const hasImage = formats.some(f => f.startsWith('image/'))
        if (!hasText && hasImage) {
          const img = clipboard.readImage()
          if (!img.isEmpty()) {
            const hash = img.toPNG().toString('base64').slice(0, 100)
            if (hash !== this._lastImageHash) {
              this._lastImageHash = hash
              const nextId = await this._getNextId('image')
              const filePath = await saveImage(nextId, img)
              tbsDbManager.addClipboardImage(filePath)
            }
          }
        }
      } catch {
        // 静默忽略
      }
    }, 1000)
  }

  bindIpcMain() {
    // ---------- 文本 ----------
    ipcMain.handle('clipboard:history', async (event, keyword, favoritesOnly) => {
      return tbsDbManager.getClipboardHistory(keyword || '', 200, !!favoritesOnly)
    })
    ipcMain.handle('clipboard:clear', async () => {
      tbsDbManager.clearClipboardHistory()
      this._lastText = ''
    })
    ipcMain.handle('clipboard:clear:pinned', async () => {
      tbsDbManager.clearClipboardPinned()
    })
    ipcMain.handle('clipboard:clear:favorites', async () => {
      tbsDbManager.clearClipboardFavorites()
    })
    ipcMain.handle('clipboard:clear:normal', async () => {
      tbsDbManager.clearClipboardNormal()
    })
    ipcMain.handle('clipboard:delete', async (event, id) => {
      tbsDbManager.removeClipboardRecord(id)
      return true
    })

    // ---------- 置顶 / 收藏 ----------
    ipcMain.handle('clipboard:pin:toggle', async (event, id) => {
      tbsDbManager.togglePin(id)
      return true
    })
    ipcMain.handle('clipboard:favorite:toggle', async (event, id) => {
      tbsDbManager.toggleFavorite(id)
      return true
    })

    // ---------- 图片 ----------
    ipcMain.handle('clipboard:images', async () => {
      const list = tbsDbManager.getClipboardImages()
      const result = []
      for (const item of list) {
        const dataUrl = await readFileAsDataUrl(item.file_path)
        result.push({ ...item, dataUrl })
      }
      return result
    })
    ipcMain.handle('clipboard:image:delete', async (event, id) => {
      const list = tbsDbManager.getClipboardImages()
      const item = list.find(i => i.id === id)
      if (item) await deleteFile(item.file_path)
      tbsDbManager.removeClipboardImage(id)
      return true
    })
    ipcMain.handle('clipboard:images:clear', async () => {
      const list = tbsDbManager.getClipboardImages()
      for (const item of list) {
        await deleteFile(item.file_path)
      }
      tbsDbManager.clearClipboardImages()
      this._lastImageHash = ''
    })

    // ---------- 文件 ----------
    ipcMain.handle('clipboard:files', async () => {
      const list = tbsDbManager.getClipboardFiles()
      const result = []
      for (const item of list) {
        const dataUrl = await readFileAsDataUrl(item.file_path)
        let size = 0
        try {
          const stat = await fs.stat(item.file_path)
          size = stat.size
        } catch {}
        result.push({ ...item, dataUrl, size })
      }
      return result
    })
    ipcMain.handle('clipboard:file:delete', async (event, id) => {
      const list = tbsDbManager.getClipboardFiles()
      const item = list.find(i => i.id === id)
      if (item) await deleteFile(item.file_path)
      tbsDbManager.removeClipboardFile(id)
      return true
    })
    ipcMain.handle('clipboard:files:clear', async () => {
      const list = tbsDbManager.getClipboardFiles()
      for (const item of list) {
        await deleteFile(item.file_path)
      }
      tbsDbManager.clearClipboardFiles()
    })
    ipcMain.handle('clipboard:file:open', async (event, filePath) => {
      return await shell.openPath(filePath)
    })

    // ---------- 图片复制 ----------
    ipcMain.handle('clipboard:image:copy', async (event, filePath) => {
      const img = nativeImage.createFromPath(filePath)
      clipboard.writeImage(img)
      return true
    })

    // ---------- 外部链接 ----------
    ipcMain.handle('clipboard:url:open', async (event, url) => {
      await shell.openExternal(url)
      return true
    })

    // ---------- 开关 ----------
    ipcMain.handle('clipboard:toggle', async (event, enabled) => {
      storeManager.set('clipboardWatchEnabled', enabled ? 1 : 0)
      if (enabled) {
        await this.start()
      } else {
        this.stop()
        this._lastText = ''
        this._lastImageHash = ''
      }
      return true
    })
  }
}

export default new ClipboardWatcher()
