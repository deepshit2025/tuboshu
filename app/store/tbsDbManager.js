import {app, nativeImage} from 'electron'
import crypto from 'crypto'
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
  CREATE TABLE IF NOT EXISTS clipboard_files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path   TEXT NOT NULL,
    origin_name TEXT NOT NULL DEFAULT '',
    timestamp   INTEGER NOT NULL,
    source      TEXT NOT NULL DEFAULT ''
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

    // 2. 迁移旧 JSON 数据
    const oldDbPath = path.join(app.getPath('userData'), 'userdata.db')
    migrateFromLegacyDb(db, oldDbPath)

    // 3. 填充初始数据（空库时）
    this._seedIfEmpty(db)

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
    const db = getDb()
    exec(db,
      `INSERT INTO clipboard_history (content, timestamp, source)
       VALUES (?, ?, ?)`,
      [content, Date.now(), source]
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

  getClipboardHistory(keyword = '', limit = 200) {
    const db = getDb()
    if (keyword) {
      return queryAll(db,
        'SELECT * FROM clipboard_history WHERE content LIKE ? ORDER BY timestamp DESC LIMIT ?',
        [`%${keyword}%`, limit]
      )
    }
    return queryAll(db,
      'SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?',
      [limit]
    )
  }

  clearClipboardHistory() {
    getDb().run('DELETE FROM clipboard_history')
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
    return row?.content || ''
  }

  findClipboardByContent(content) {
    return queryOne(getDb(),
      'SELECT id FROM clipboard_history WHERE content = ? LIMIT 1',
      [content]
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
