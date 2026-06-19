import initSqlJs from 'sql.js'
import fs from 'fs'

let db = null
let dbPath = ''
let sqlJsReady = false

/**
 * 初始化 sql.js 数据库
 * @param {string} filePath - 数据库文件路径
 */
export async function initDatabase(filePath) {
  if (sqlJsReady) return

  const SQL = await initSqlJs()

  // 尝试加载已有数据库
  let buffer
  try {
    buffer = fs.readFileSync(filePath)
  } catch {
    buffer = null
  }

  db = buffer ? new SQL.Database(buffer) : new SQL.Database()
  db.run('PRAGMA journal_mode = WAL')
  dbPath = filePath
  sqlJsReady = true
}

/**
 * 获取当前数据库实例
 * @returns {import('sql.js').Database}
 */
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

/**
 * 将数据库写入磁盘
 */
export function persistSync() {
  if (!db || !dbPath) return
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

/**
 * 关闭数据库
 */
export function closeDatabase() {
  if (db) {
    persistSync()
    db.close()
    db = null
    sqlJsReady = false
  }
}
