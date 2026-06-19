import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { constants } from 'fs'

const CLIPBOARD_DIR = path.join(app.getPath('userData'), 'clipboard')
const IMAGES_DIR = path.join(CLIPBOARD_DIR, 'images')
const FILES_DIR = path.join(CLIPBOARD_DIR, 'files')

async function ensureDir(dir) {
  try {
    await fs.access(dir, constants.F_OK)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function initClipboardDirs() {
  await ensureDir(IMAGES_DIR)
  await ensureDir(FILES_DIR)
}

export function getImagesDir() {
  return IMAGES_DIR
}

export function getFilesDir() {
  return FILES_DIR
}

export async function saveImage(id, nativeImage) {
  await ensureDir(IMAGES_DIR)
  const filePath = path.join(IMAGES_DIR, `${id}.png`)
  await fs.writeFile(filePath, nativeImage.toPNG())
  return filePath
}

export async function saveFile(id, sourcePath) {
  await ensureDir(FILES_DIR)
  const ext = path.extname(sourcePath)
  const fileName = `${id}${ext || ''}`
  const destPath = path.join(FILES_DIR, fileName)
  await fs.copyFile(sourcePath, destPath)
  return destPath
}

export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath)
  } catch {
    // 文件不存在时静默忽略
  }
}

export async function readFileAsDataUrl(filePath) {
  try {
    const data = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mime = mimeMap[ext] || 'application/octet-stream'
    return `data:${mime};base64,${data.toString('base64')}`
  } catch {
    return null
  }
}

export { CLIPBOARD_DIR }
