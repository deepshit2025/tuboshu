import {app, nativeImage} from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import {initDatabase, getDb, persistSync, closeDatabase} from './database.js'
import {migrateFromLegacyDb} from './migrate.js'
import CONS from '../constants.js'

const md5Hash = (data) => crypto.createHash('md5').update(data).digest('hex')
const processImg = (menuArray) => menuArray.map(element => {
  if (element.img.startsWith('data:')) return element
  if (element.img.includes('preview_default')) element.img = CONS.APP.PREVIEW_IMG
  const imagePath = path.join(CONS.APP.PATH, element.img)
  const Img = nativeImage.createFromPath(imagePath)
  return { ...element, img: Img.toDataURL() }
})

// ---------- SQL 辅助 ----------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sites (
    name    TEXT PRIMARY KEY,
    tag     TEXT NOT NULL DEFAULT '',
    url     TEXT NOT NULL DEFAULT '',
    img     TEXT NOT NULL DEFAULT '',
    isOpen  INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    jsCode  TEXT NOT NULL DEFAULT '',
    proxy   TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS shortcuts (
    name     TEXT PRIMARY KEY,
    tag      TEXT NOT NULL DEFAULT '',
    cmd      TEXT NOT NULL DEFAULT '',
    isGlobal INTEGER NOT NULL DEFAULT 0,
    isOpen   INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS groups_t (
    name   TEXT PRIMARY KEY,
    tag    TEXT NOT NULL DEFAULT '',
    sites  TEXT NOT NULL DEFAULT '',
    isOpen INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS setting (
    name  TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS clipboard_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    content   TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source    TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_clipboard_ts ON clipboard_history(timestamp DESC);
  CREATE TABLE IF NOT EXISTS clipboard_images (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    source    TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS plugin (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    version     TEXT NOT NULL DEFAULT '',
    author      TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'built-in',
    enabled     INTEGER NOT NULL DEFAULT 1,
    installed_at TEXT NOT NULL DEFAULT '',
    ext_path    TEXT NOT NULL DEFAULT ''
  );`

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params.map(p => p === undefined ? null : p))
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params.map(p => p === undefined ? null : p))
  let row = null
  if (stmt.step()) {
    row = stmt.getAsObject()
  }
  stmt.free()
  return row
}

function exec(db, sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params.map(p => p === undefined ? null : p))
  stmt.step()
  stmt.free()
}

// ---------- Manager ----------

class TbsDbManager {

  async init() {
    if (this._initialized) return
    const db = getDb()

    // 1. 建表
    db.run(SCHEMA_SQL)

    // 2. 迁移：添加置顶/收藏字段（若表已存在但缺列）
    this._migrateClipboardColumns(db)

    // 2. 迁移旧 JSON 数据
    const oldDbPath = path.join(app.getPath('userData'), 'userdata.db')
    migrateFromLegacyDb(db, oldDbPath)

    // 3. 填充初始数据（空库时）
    this._seedIfEmpty(db)

    // 4. 初始化内置插件
    this._seedPluginsIfEmpty(db)

    this._initialized = true
  }

  _seedIfEmpty(db) {
    if (queryOne(db, 'SELECT 1 FROM sites LIMIT 1') === null) {
      for (const site of CONS.SITES) {
        exec(db,
          `INSERT INTO sites (name, tag, url, img, isOpen, "order", jsCode, proxy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [site.name, site.tag, site.url, site.img, site.isOpen ? 1 : 0, site.order || 0, '', '']
        )
      }
    }
    if (queryOne(db, 'SELECT 1 FROM shortcuts LIMIT 1') === null) {
      for (const sc of CONS.SHORTCUT) {
        exec(db,
          `INSERT INTO shortcuts (name, tag, cmd, isGlobal, isOpen)
           VALUES (?, ?, ?, ?, ?)`,
          [sc.name, sc.tag, sc.cmd, sc.isGlobal ? 1 : 0, sc.isOpen ? 1 : 0]
        )
      }
    }
  }

  _seedPluginsIfEmpty(db) {
    if (queryOne(db, 'SELECT 1 FROM plugin LIMIT 1') !== null) return

    const pluginsDir = path.join(CONS.APP.PATH, 'resource/plugin')
    let entries
    try {
      entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
    } catch {
      return
    }

    const now = String(Date.now())
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json')
      let manifest
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      } catch {
        continue
      }

      const id = entry.name.replace(/\.ext$/i, '')
      exec(db,
        `INSERT OR IGNORE INTO plugin (id, name, description, version, author, type, enabled, installed_at, ext_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, manifest.name || id, manifest.description || '',
         manifest.version || '1.0', manifest.author || '',
         'built-in', 1, now, path.join(pluginsDir, entry.name)]
      )
    }
    persistSync()
  }

  _migrateClipboardColumns(db) {
    // 检查 pinned 列是否存在
    const cols = queryAll(db, 'PRAGMA table_info(clipboard_history)')
    const colNames = cols.map(c => c.name)
    if (!colNames.includes('pinned')) {
      db.run('ALTER TABLE clipboard_history ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0')
    }
    if (!colNames.includes('pin_time')) {
      db.run('ALTER TABLE clipboard_history ADD COLUMN pin_time INTEGER NOT NULL DEFAULT 0')
    }
    if (!colNames.includes('favorite')) {
      db.run('ALTER TABLE clipboard_history ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0')
    }
  }

  // ---------- plugin ----------

  getPlugins() {
    return queryAll(getDb(), 'SELECT * FROM plugin ORDER BY type ASC, name ASC').map(p => ({
      ...p,
      enabled: !!p.enabled
    }))
  }

  getPlugin(id) {
    const row = queryOne(getDb(), 'SELECT * FROM plugin WHERE id = ?', [id])
    if (row) row.enabled = !!row.enabled
    return row
  }

  addPlugin(plugin) {
    const db = getDb()
    exec(db,
      `INSERT OR REPLACE INTO plugin (id, name, description, version, author, type, enabled, installed_at, ext_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plugin.id, plugin.name || '', plugin.description || '', plugin.version || '',
       plugin.author || '', plugin.type || 'local', plugin.enabled ? 1 : 0,
       plugin.installed_at || String(Date.now()), plugin.ext_path || '']
    )
    persistSync()
  }

  updatePlugin(id, fields) {
    const db = getDb()
    const existing = queryOne(db, 'SELECT * FROM plugin WHERE id = ?', [id])
    if (!existing) return
    const merged = { ...existing, ...fields }
    exec(db,
      `UPDATE plugin SET name = ?, description = ?, version = ?, author = ?,
        type = ?, enabled = ?, installed_at = ?, ext_path = ?
       WHERE id = ?`,
      [merged.name || '', merged.description || '', merged.version || '',
       merged.author || '', merged.type || 'local', merged.enabled ? 1 : 0,
       merged.installed_at || '', merged.ext_path || '', id]
    )
    persistSync()
  }

  removePlugin(id) {
    getDb().run('DELETE FROM plugin WHERE id = ?', [id])
    persistSync()
  }

  // ---------- sites ----------

  getSites() {
    return queryAll(getDb(), 'SELECT * FROM sites ORDER BY "order" ASC').map(s => ({ ...s, isOpen: !!s.isOpen }))
  }

  clearSites() {
    getDb().run('DELETE FROM sites')
    persistSync()
  }

  getSite(name) {
    const row = queryOne(getDb(), 'SELECT * FROM sites WHERE name = ?', [name])
    if (row) row.isOpen = !!row.isOpen
    return row
  }

  addSite(site) {
    const db = getDb()
    const cnt = queryOne(db, 'SELECT COUNT(*) AS c FROM sites')
    const order = (cnt?.c || 0) + 1
    const name = md5Hash(site.name + String(Date.now()))
    exec(db,
      `INSERT INTO sites (name, tag, url, img, isOpen, "order", jsCode, proxy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, site.tag || '', site.url || '', site.img || '',
       site.isOpen ? 1 : 0, order, site.jsCode || '', site.proxy || '']
    )
    persistSync()
    return { ...site, name, order }
  }

  updateSite(site) {
    const db = getDb()
    const existing = queryOne(db, 'SELECT * FROM sites WHERE name = ?', [site.name])
    if (!existing) return
    const merged = { ...existing, ...site }
    exec(db,
      `UPDATE sites SET tag = ?, url = ?, img = ?, isOpen = ?, "order" = ?, jsCode = ?, proxy = ?
       WHERE name = ?`,
      [merged.tag || '', merged.url || '', merged.img || '',
       merged.isOpen ? 1 : 0, merged.order || 0,
       merged.jsCode || '', merged.proxy || '', site.name]
    )
    persistSync()
  }

  batchUpdateSite(sites) {
    if (sites.length === 0) return
    const db = getDb()
    db.run('BEGIN TRANSACTION')
    try {
      for (const site of sites) {
        const existing = queryOne(db, 'SELECT * FROM sites WHERE name = ?', [site.name])
        if (!existing) continue
        const merged = { ...existing, ...site }
        exec(db,
          `UPDATE sites SET tag = ?, url = ?, img = ?, isOpen = ?, "order" = ?, jsCode = ?, proxy = ?
           WHERE name = ?`,
          [merged.tag || '', merged.url || '', merged.img || '',
           merged.isOpen ? 1 : 0, merged.order || 0,
           merged.jsCode || '', merged.proxy || '', site.name]
        )
      }
      db.run('COMMIT')
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }
    persistSync()
  }

  removeSite(site) {
    getDb().run('DELETE FROM sites WHERE name = ?', [site.name])
    persistSync()
  }

  getMenus() {
    const db = getDb()
    let sites = queryAll(db, 'SELECT * FROM sites ORDER BY "order" ASC')
    if (sites.length === 0) sites = CONS.SITES
    sites = sites.map(s => ({ ...s, isOpen: !!s.isOpen }))
    return {
      openMenus: processImg(sites.filter(s => s.isOpen)),
      closeMenus: processImg(sites.filter(s => !s.isOpen)),
      setMenus: processImg(CONS.SETTING)
    }
  }

  getGroupMenus() {
    const menus = this.getMenus()
    const group = this.getOpenGroup()
    if (group) {
      const webs = group.sites.split(',').filter(Boolean)
      const listMap = new Map()
      menus.openMenus.forEach(item => { listMap.set(item.name, item) })
      menus.openMenus = webs.map(name => listMap.get(name)).filter(Boolean)
    }
    return menus
  }

  // ---------- shortcuts ----------

  getShortcuts() {
    return queryAll(getDb(), 'SELECT * FROM shortcuts ORDER BY isOpen DESC').map(s => ({ ...s, isOpen: !!s.isOpen }))
  }

  getShortcut(name) {
    const row = queryOne(getDb(), 'SELECT * FROM shortcuts WHERE name = ?', [name])
    if (row) row.isOpen = !!row.isOpen
    return row
  }

  updateShortcut(shortcut) {
    const db = getDb()
    const existing = queryOne(db, 'SELECT * FROM shortcuts WHERE name = ?', [shortcut.name])
    if (!existing) return null
    const merged = { ...existing, ...shortcut }
    exec(db,
      `UPDATE shortcuts SET tag = ?, cmd = ?, isGlobal = ?, isOpen = ?
       WHERE name = ?`,
      [merged.tag || '', merged.cmd || '', merged.isGlobal ? 1 : 0,
       merged.isOpen ? 1 : 0, shortcut.name]
    )
    persistSync()
    return true
  }

  addShortcut(shortcut) {
    exec(getDb(),
      `INSERT INTO shortcuts (name, tag, cmd, isGlobal, isOpen)
       VALUES (?, ?, ?, ?, ?)`,
      [shortcut.name, shortcut.tag || '', shortcut.cmd || '',
       shortcut.isGlobal ? 1 : 0, shortcut.isOpen ? 1 : 0]
    )
    persistSync()
    return true
  }

  // ---------- groups ----------

  getGroups() {
    return queryAll(getDb(), 'SELECT * FROM groups_t').map(g => ({ ...g, isOpen: !!g.isOpen }))
  }

  updateGroup(group) {
    const db = getDb()
    const existing = queryOne(db, 'SELECT * FROM groups_t WHERE name = ?', [group.name])

    // 不存在时插入新记录
    if (!existing) {
      const newName = group.name || md5Hash(String(Date.now()))
      exec(db,
        `INSERT INTO groups_t (name, tag, sites, isOpen)
         VALUES (?, ?, ?, ?)`,
        [newName, group.tag || '', group.sites || '', group.isOpen ? 1 : 0]
      )
      persistSync()
      return true
    }

    // 如果当前分组要设为打开，需要先关闭其他打开的分组
    if (group.isOpen === true) {
      exec(db, 'UPDATE groups_t SET isOpen = 0 WHERE isOpen = 1 AND name != ?', [group.name])
    }

    // 合并更新
    const merged = { ...existing, ...group }
    exec(db,
      `UPDATE groups_t SET tag = ?, sites = ?, isOpen = ? WHERE name = ?`,
      [merged.tag || '', merged.sites || '', merged.isOpen ? 1 : 0, group.name]
    )
    persistSync()
    return true
  }

  getOpenGroup() {
    return queryOne(getDb(), 'SELECT * FROM groups_t WHERE isOpen = 1')
  }

  resetGroup() {
    getDb().run('UPDATE groups_t SET isOpen = 0 WHERE isOpen = 1')
    persistSync()
  }

  removeGroup(group) {
    getDb().run('DELETE FROM groups_t WHERE name = ?', [group.name])
    persistSync()
  }

  // ---------- clipboard history ----------

  addClipboardRecord(content, source = '') {
    const trimmed = content.trim()
    const db = getDb()
    exec(db,
      `INSERT INTO clipboard_history (content, timestamp, source)
       VALUES (?, ?, ?)`,
      [trimmed, Date.now(), source]
    )
    // 超过上限时删除最旧的
    const row = queryOne(db, 'SELECT value FROM setting WHERE name = ?', ['clipboardMaxHistory'])
    const max = row ? (JSON.parse(row.value) || 500) : 500
    const count = queryOne(db, 'SELECT COUNT(*) AS c FROM clipboard_history')
    if ((count?.c || 0) > max) {
      const excess = (count.c || 0) - max
      db.run(`DELETE FROM clipboard_history WHERE id IN (
        SELECT id FROM clipboard_history ORDER BY timestamp ASC LIMIT ?
      )`, [excess])
    }
    persistSync()
  }

  getClipboardHistory(keyword = '', limit = 200, favoritesOnly = false) {
    const db = getDb()
    const conditions = []
    const params = []

    if (keyword) {
      conditions.push('content LIKE ?')
      params.push(`%${keyword}%`)
    }
    if (favoritesOnly) {
      conditions.push('favorite = 1')
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    return queryAll(db,
      `SELECT * FROM clipboard_history ${where} ORDER BY pinned DESC, pin_time DESC, timestamp DESC LIMIT ?`,
      [...params, limit]
    )
  }

  togglePin(id) {
    const db = getDb()
    const row = queryOne(db, 'SELECT pinned FROM clipboard_history WHERE id = ?', [id])
    if (!row) return
    const newPinned = row.pinned ? 0 : 1
    db.run(
      'UPDATE clipboard_history SET pinned = ?, pin_time = ? WHERE id = ?',
      [newPinned, newPinned ? Date.now() : 0, id]
    )
    persistSync()
  }

  toggleFavorite(id) {
    const db = getDb()
    db.run('UPDATE clipboard_history SET favorite = CASE WHEN favorite THEN 0 ELSE 1 END WHERE id = ?', [id])
    persistSync()
  }

  clearClipboardHistory() {
    getDb().run('DELETE FROM clipboard_history')
    persistSync()
  }

  clearClipboardPinned() {
    getDb().run('DELETE FROM clipboard_history WHERE pinned = 1')
    persistSync()
  }

  clearClipboardFavorites() {
    getDb().run('DELETE FROM clipboard_history WHERE favorite = 1')
    persistSync()
  }

  clearClipboardNormal() {
    getDb().run('DELETE FROM clipboard_history WHERE pinned = 0 AND favorite = 0')
    persistSync()
  }

  removeClipboardRecord(id) {
    getDb().run('DELETE FROM clipboard_history WHERE id = ?', [id])
    persistSync()
  }

  getLastClipboardContent() {
    const row = queryOne(getDb(),
      'SELECT content FROM clipboard_history ORDER BY timestamp DESC LIMIT 1'
    )
    return (row?.content || '').trim()
  }

  findClipboardByContent(content) {
    const trimmed = content.trim()
    return queryOne(getDb(),
      'SELECT id FROM clipboard_history WHERE content = ? LIMIT 1',
      [trimmed]
    )
  }

  updateClipboardTimestamp(id) {
    const db = getDb()
    db.run('UPDATE clipboard_history SET timestamp = ? WHERE id = ?', [Date.now(), id])
    persistSync()
  }

  // ---------- clipboard images ----------

  addClipboardImage(filePath) {
    const db = getDb()
    exec(db,
      `INSERT INTO clipboard_images (file_path, timestamp, source)
       VALUES (?, ?, ?)`,
      [filePath, Date.now(), '']
    )
    persistSync()
  }

  getClipboardImages(limit = 200) {
    return queryAll(getDb(),
      'SELECT * FROM clipboard_images ORDER BY timestamp DESC LIMIT ?',
      [limit]
    )
  }

  removeClipboardImage(id) {
    getDb().run('DELETE FROM clipboard_images WHERE id = ?', [id])
    persistSync()
  }

  clearClipboardImages() {
    getDb().run('DELETE FROM clipboard_images')
    persistSync()
  }

  // ---------- clipboard files ----------

  addClipboardFile(filePath, originName) {
    const db = getDb()
    exec(db,
      `INSERT INTO clipboard_files (file_path, origin_name, timestamp, source)
       VALUES (?, ?, ?, ?)`,
      [filePath, originName, Date.now(), '']
    )
    persistSync()
  }

  getClipboardFiles(limit = 200) {
    return queryAll(getDb(),
      'SELECT * FROM clipboard_files ORDER BY timestamp DESC LIMIT ?',
      [limit]
    )
  }

  removeClipboardFile(id) {
    getDb().run('DELETE FROM clipboard_files WHERE id = ?', [id])
    persistSync()
  }

  clearClipboardFiles() {
    getDb().run('DELETE FROM clipboard_files')
    persistSync()
  }

  // ---------- setting（使用 JSON.stringify/parse 保持类型）----------

  addSetting(key, val) {
    getDb().run('INSERT OR REPLACE INTO setting (name, value) VALUES (?, ?)',
      [key, JSON.stringify(val)])
    persistSync()
  }

  getSetting(key) {
    const row = queryOne(getDb(), 'SELECT value FROM setting WHERE name = ?', [key])
    if (!row) return undefined
    try { return JSON.parse(row.value) } catch { return row.value }
  }

  hasSetting(key) {
    const row = queryOne(getDb(), 'SELECT 1 AS found FROM setting WHERE name = ?', [key])
    return row !== null && row !== undefined
  }

  updateSetting(key, val) {
    getDb().run(
      `INSERT INTO setting (name, value) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(val)]
    )
    persistSync()
  }

  // ---------- 全量数据导出 / 恢复（用于同步功能）----------

  getAllConfigData() {
    const db = getDb()
    const now = Math.floor(Date.now() / 1000)
    return {
      collections: {
        sites: { data: queryAll(db, 'SELECT * FROM sites ORDER BY "order" ASC'), version: 0, update_at: now },
        shortcuts: { data: queryAll(db, 'SELECT * FROM shortcuts'), version: 0, update_at: now },
        groups: { data: queryAll(db, 'SELECT * FROM groups_t'), version: 0, update_at: now },
        setting: { data: this._getSettingObjs(db), version: 0, update_at: now }
      }
    }
  }

  _getSettingObjs(db) {
    const rows = queryAll(db, 'SELECT name, value FROM setting')
    return rows.map(r => {
      let parsed
      try { parsed = JSON.parse(r.value) } catch { parsed = r.value }
      return { name: r.name, value: parsed }
    })
  }

  restoreAllConfigData(newData) {
    if (!newData || !newData.collections) return
    const db = getDb()
    db.run('BEGIN TRANSACTION')
    try {
      // 清空所有表
      db.run('DELETE FROM sites')
      db.run('DELETE FROM shortcuts')
      db.run('DELETE FROM groups_t')
      db.run('DELETE FROM setting')

      // 恢复 sites
      const sitesData = newData.collections.sites?.data || []
      for (const s of sitesData) {
        db.run(
          `INSERT OR IGNORE INTO sites (name, tag, url, img, isOpen, "order", jsCode, proxy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.name || '', s.tag || '', s.url || '', s.img || '',
           s.isOpen ? 1 : 0, s.order || 0, s.jsCode || '', s.proxy || '']
        )
      }

      // 恢复 shortcuts
      const scData = newData.collections.shortcuts?.data || []
      for (const s of scData) {
        db.run(
          `INSERT OR IGNORE INTO shortcuts (name, tag, cmd, isGlobal, isOpen)
           VALUES (?, ?, ?, ?, ?)`,
          [s.name || '', s.tag || '', s.cmd || '',
           s.isGlobal ? 1 : 0, s.isOpen ? 1 : 0]
        )
      }

      // 恢复 groups
      const grpData = newData.collections.groups?.data || []
      for (const g of grpData) {
        db.run(
          `INSERT OR IGNORE INTO groups_t (name, tag, sites, isOpen)
           VALUES (?, ?, ?, ?)`,
          [g.name || '', g.tag || '', g.sites || '', g.isOpen ? 1 : 0]
        )
      }

      // 恢复 setting
      const setData = newData.collections.setting?.data || []
      for (const s of setData) {
        db.run(
          `INSERT OR IGNORE INTO setting (name, value) VALUES (?, ?)`,
          [s.name || '', JSON.stringify(s.value ?? '')]
        )
      }

      db.run('COMMIT')
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }
    persistSync()
  }

}

export default new TbsDbManager()
export {closeDatabase, persistSync}
