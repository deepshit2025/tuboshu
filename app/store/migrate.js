import fs from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * 从旧版 JSON 数据库迁移数据到 sql.js SQLite 数据库
 * @param {import('sql.js').Database} db - sql.js 数据库实例
 * @param {string} oldDbPath - 旧版 userdata.db 路径
 */
export function migrateFromLegacyDb(db, oldDbPath) {
  if (!fs.existsSync(oldDbPath)) return

  console.log('[迁移] 检测到旧版数据库:', oldDbPath)

  let raw
  try {
    raw = fs.readFileSync(oldDbPath, 'utf8')
  } catch (e) {
    console.warn('[迁移] 读取旧数据库失败:', e.message)
    return
  }

  let dbData
  try {
    dbData = JSON.parse(raw)
  } catch (e) {
    console.warn('[迁移] 解析旧数据库 JSON 失败:', e.message)
    return
  }

  if (!dbData.collections || Object.keys(dbData.collections).length === 0) {
    console.log('[迁移] 旧数据库为空，无需迁移')
    return
  }

  const collections = dbData.collections

  db.run('BEGIN TRANSACTION')
  try {
    // 迁移 sites
    if (collections.sites) {
      const data = collections.sites.data || []
      for (const s of data) {
        db.run(
          `INSERT OR IGNORE INTO sites (name, tag, url, img, isOpen, "order", jsCode, proxy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.name || '', s.tag || '', s.url || '', s.img || '',
           s.isOpen ? 1 : 0, s.order || 0, s.jsCode || '', s.proxy || '']
        )
      }
      console.log(`[迁移] 已迁移 ${data.length} 条站点数据`)
    }

    // 迁移 shortcuts
    if (collections.shortcuts) {
      const data = collections.shortcuts.data || []
      for (const s of data) {
        db.run(
          `INSERT OR IGNORE INTO shortcuts (name, tag, cmd, isGlobal, isOpen)
           VALUES (?, ?, ?, ?, ?)`,
          [s.name || '', s.tag || '', s.cmd || '',
           s.isGlobal ? 1 : 0, s.isOpen ? 1 : 0]
        )
      }
      console.log(`[迁移] 已迁移 ${data.length} 条快捷方式数据`)
    }

    // 迁移 groups
    if (collections.groups) {
      const data = collections.groups.data || []
      for (const g of data) {
        db.run(
          `INSERT OR IGNORE INTO groups_t (name, tag, sites, isOpen)
           VALUES (?, ?, ?, ?)`,
          [g.name || '', g.tag || '', g.sites || '', g.isOpen ? 1 : 0]
        )
      }
      console.log(`[迁移] 已迁移 ${data.length} 条分组数据`)
    }

    // 迁移 setting（使用 JSON.stringify 保持原始类型）
    if (collections.setting) {
      const data = collections.setting.data || []
      for (const s of data) {
        db.run(
          `INSERT OR IGNORE INTO setting (name, value) VALUES (?, ?)`,
          [s.name || '', JSON.stringify(s.value ?? '')]
        )
      }
      console.log(`[迁移] 已迁移 ${data.length} 条设置数据`)
    }

    db.run('COMMIT')

    // 重命名旧数据库文件为 .bak
    try {
      fs.renameSync(oldDbPath, oldDbPath + '.bak')
    } catch (e) {
      console.warn('[迁移] 无法重命名旧数据库:', e.message)
    }

    console.log('[迁移] 完成，旧数据库已重命名为 userdata.db.bak')
  } catch (e) {
    db.run('ROLLBACK')
    console.error('[迁移] 失败，已回滚:', e.message)
    throw e
  }
}
