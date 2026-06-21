import fs from 'fs'
import path from 'path'
import tbsDbManager from './store/tbsDbManager.js'
import CONS from './constants.js'

class PluginManager {

  /**
   * 获取插件完整列表（从 DB 读取，合并文件系统状态）
   */
  getPlugins() {
    return tbsDbManager.getPlugins()
  }

  /**
   * 获取单个插件
   */
  getPlugin(id) {
    return tbsDbManager.getPlugin(id)
  }

  /**
   * 获取所有已启用的插件路径列表
   */
  getEnabledPluginPaths() {
    const plugins = tbsDbManager.getPlugins()
    return plugins
      .filter(p => p.enabled && p.ext_path)
      .map(p => p.ext_path)
  }

  /**
   * 只加载已启用的扩展到指定 session
   * @param {import('electron').WebContentsView['webContents']['session']} session
   */
  async loadEnabledExtensions(session) {
    const paths = this.getEnabledPluginPaths()
    for (const extPath of paths) {
      if (!fs.existsSync(extPath)) continue
      try {
        await session.extensions.loadExtension(extPath)
      } catch (err) {
        console.error(`[pluginManager] Failed to load extension ${extPath}:`, err)
      }
    }
    return true
  }

  /**
   * 切换插件的启用/禁用状态
   */
  togglePlugin(id, enabled) {
    tbsDbManager.updatePlugin(id, { enabled })
  }

  /**
   * 从本地路径安装插件（复制插件目录到 resource/plugin/）
   * @param {string} sourcePath - 源插件目录路径
   * @returns {{ success: boolean, id?: string, error?: string }}
   */
  installFromLocal(sourcePath) {
    const dirName = path.basename(sourcePath)

    // 验证源路径是目录
    if (!fs.statSync(sourcePath).isDirectory()) {
      return { success: false, error: '源路径必须是一个目录' }
    }

    // 插件 ID：目录名去掉 .ext 后缀（兼容旧命名），否则直接用目录名
    const id = dirName.replace(/\.ext$/i, '')
    const targetDir = path.join(CONS.APP.PATH, 'resource/plugin', dirName)

    // 检查文件系统是否已存在同名目录
    if (fs.existsSync(targetDir)) {
      return { success: false, error: '该插件已存在' }
    }

    // 检查数据库是否已有同名 id 的插件记录
    const existing = tbsDbManager.getPlugin(id)
    if (existing) {
      return { success: false, error: `插件 ID「${id}」已被插件「${existing.name}」占用` }
    }

    // 读取 manifest 获取元数据
    const manifestPath = path.join(sourcePath, 'manifest.json')
    let manifest
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch {
      return { success: false, error: '无法读取 manifest.json' }
    }

    // 复制目录
    try {
      this._copyDirSync(sourcePath, targetDir)
    } catch (err) {
      return { success: false, error: `复制插件目录失败: ${err.message}` }
    }

    // 写入数据库
    tbsDbManager.addPlugin({
      id,
      name: manifest.name || id,
      description: manifest.description || '',
      version: manifest.version || '1.0',
      author: manifest.author || '',
      type: 'local',
      enabled: true,
      installed_at: String(Date.now()),
      ext_path: targetDir
    })

    return { success: true, id }
  }

  /**
   * 卸载插件（删除目录 + 数据库记录）
   */
  uninstall(id) {
    const plugin = tbsDbManager.getPlugin(id)
    if (!plugin) return { success: false, error: '插件不存在' }
    if (plugin.type === 'built-in') {
      return { success: false, error: '内置插件无法卸载' }
    }

    // 删除目录
    if (plugin.ext_path && fs.existsSync(plugin.ext_path)) {
      fs.rmSync(plugin.ext_path, { recursive: true, force: true })
    }

    // 删除数据库记录
    tbsDbManager.removePlugin(id)

    return { success: true }
  }

  // ---------- 内部工具 ----------

  _copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true })
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        this._copyDirSync(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

export default new PluginManager()
