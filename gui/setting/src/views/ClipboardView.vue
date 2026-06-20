<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const message = useMessage()
const keyword = ref('')
const isWatchEnabled = ref(false)
const activeTab = ref('text')

const textList = ref([])
const imageList = ref([])
const fileList = ref([])

let pollTimer = null

// ---------- 相对时间 ----------
function relativeTime(ts) {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  const date = new Date(ts)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
    date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(name) {
  if (!name) return '📄'
  const ext = name.split('.').pop().toLowerCase()
  const map = {
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
    ppt: '📙', pptx: '📙', zip: '📦', rar: '📦', '7z': '📦',
    gz: '📦', tar: '📦', mp3: '🎵', wav: '🎵', flac: '🎵',
    mp4: '🎬', avi: '🎬', mov: '🎬', mkv: '🎬',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
    svg: '🖼️', ico: '🖼️', txt: '📃', json: '📋', xml: '📋',
    md: '📝', html: '🌐', css: '🎨', js: '⚡', ts: '⚡',
    exe: '⚙️', dmg: '⚙️', app: '⚙️', deb: '⚙️',
  }
  return map[ext] || '📄'
}

function isUrl(text) {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}

// ---------- 数据加载 ----------
const loadText = async () => {
  try {
    textList.value = await window.myApi.getClipboardHistory(keyword.value)
  } catch {}
}

const loadImages = async () => {
  try {
    imageList.value = await window.myApi.getClipboardImages()
  } catch {}
}

const loadFiles = async () => {
  try {
    fileList.value = await window.myApi.getClipboardFiles()
  } catch {}
}

const loadAll = () => {
  Promise.all([loadText(), loadImages(), loadFiles()])
}

const handleSearch = () => {
  loadText()
}

// ---------- 文本操作 ----------
const handleCopy = async (content) => {
  try {
    await window.myApi.copyClipboardText(content)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const handleDeleteText = async (id) => {
  try {
    await window.myApi.deleteClipboardRecord(id)
    textList.value = textList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

const handleOpenUrl = (url) => {
  window.myApi.openLinkInBrowser(url)
}

// ---------- 图片操作 ----------
const handleCopyImage = async (item) => {
  try {
    await window.myApi.copyClipboardImage(item.file_path)
    message.success('图片已复制到剪贴板')
  } catch (e) {
    message.error('复制失败: ' + e)
  }
}

const handleDeleteImage = async (id) => {
  try {
    await window.myApi.deleteClipboardImage(id)
    imageList.value = imageList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

// ---------- 文件操作 ----------
const handleOpenFile = async (filePath) => {
  try {
    const err = await window.myApi.openClipboardFile(filePath)
    if (err) message.error('打开失败: ' + err)
  } catch (e) {
    message.error('打开失败: ' + e)
  }
}

const handleDeleteFile = async (id) => {
  try {
    await window.myApi.deleteClipboardFile(id)
    fileList.value = fileList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

// ---------- 清空 ----------
const clearOptions = [
  { label: '清空文本记录', key: 'text' },
  { label: '清空图片记录', key: 'image' },
  { label: '清空文件记录', key: 'file' },
  { label: '清空全部', key: 'all' },
]

const handleClear = async (key) => {
  const names = { text: '文本', image: '图片', file: '文件', all: '全部' }
  if (!window.confirm(`确定要清空${names[key]}剪贴板记录吗？此操作不可恢复。`)) return

  if (key === 'text' || key === 'all') {
    await window.myApi.clearClipboardHistory()
    textList.value = []
  }
  if (key === 'image' || key === 'all') {
    await window.myApi.clearClipboardImages()
    imageList.value = []
  }
  if (key === 'file' || key === 'all') {
    await window.myApi.clearClipboardFiles()
    fileList.value = []
  }
  message.success('已清空')
}

// ---------- 开关 ----------
const handleToggleWatch = async (val) => {
  try {
    await window.myApi.toggleClipboardWatch(val)
    isWatchEnabled.value = val
    message.success(val ? '剪贴板监控已开启' : '剪贴板监控已关闭')
  } catch (e) {
    message.error('操作失败: ' + e)
  }
}

// ---------- 生命周期 ----------
onMounted(async () => {
  await loadAll()
  try {
    const settings = await window.myApi.getSettings()
    const item = settings.find(s => s.name === 'clipboardWatchEnabled')
    if (item) isWatchEnabled.value = item.value
  } catch {}

  pollTimer = setInterval(() => {
    if (document.hidden) return
    loadAll()
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<template>
  <div id="content-main">
    <n-alert :show-icon="false" type="info" style="margin-bottom: 1rem;">
      <n-h3 style="margin-bottom: 0;">剪贴板历史</n-h3>
    </n-alert>

    <div class="box">
      <!-- 工具栏 -->
      <div class="box-title">
        <n-switch size="small" :value="isWatchEnabled" @update:value="handleToggleWatch">
          <template #checked>
            <span style="font-size:12px;">开</span>
          </template>
          <template #unchecked>
            <span style="font-size:12px;">关</span>
          </template>
        </n-switch>
        <span class="toolbar-hint">
          {{ isWatchEnabled ? '监控中，自动识别文本/图片/文件' : '开启后自动记录剪贴板内容' }}
        </span>

        <div class="toolbar-right">
          <n-input
            v-if="activeTab === 'text'"
            size="small"
            v-model:value="keyword"
            placeholder="搜索剪贴板内容..."
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <n-icon size="14"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></n-icon>
            </template>
          </n-input>

          <n-dropdown trigger="click" :options="clearOptions" @select="handleClear">
            <n-button size="tiny" ghost>清空 ▾</n-button>
          </n-dropdown>
        </div>
      </div>

      <!-- 分类标签 -->
      <n-tabs type="line" v-model:value="activeTab" class="tabs-bar">
        <n-tab name="text">文本 ({{ textList.length }})</n-tab>
        <n-tab name="image">图片 ({{ imageList.length }})</n-tab>
        <n-tab name="file">文件 ({{ fileList.length }})</n-tab>
      </n-tabs>

      <!-- ========== 可滚动内容区域 ========== -->
      <div class="box-card" v-auto-height="{ offset: 20 }">
        <!-- ========== 文本区域（瀑布流） ========== -->
        <div v-show="activeTab === 'text'">
          <n-empty v-if="textList.length === 0" description="暂无文本记录" style="padding: 60px 0;" />
          <div v-else class="text-list">
            <div v-for="item in textList" :key="'t' + item.id" class="text-card" title="双击复制" @dblclick="handleCopy(item.content)">
              <div class="card-top">
                <span class="card-time">{{ relativeTime(item.timestamp) }}</span>
                <div class="card-actions">
                  <n-button v-if="isUrl(item.content)" size="tiny" secondary @click="handleOpenUrl(item.content)">打开链接</n-button>
                  <n-button size="tiny" quaternary @click="handleDeleteText(item.id)" class="btn-delete">删除</n-button>
                </div>
              </div>
              <div class="card-body">{{ item.content }}</div>
            </div>
          </div>
        </div>

        <!-- ========== 图片区域 ========== -->
        <div v-show="activeTab === 'image'">
          <n-empty v-if="imageList.length === 0" description="暂无图片记录" style="padding: 60px 0;" />
          <div v-else class="image-grid">
            <div v-for="item in imageList" :key="'i' + item.id" class="image-card">
              <div class="image-wrap">
                <n-image
                  :src="item.dataUrl"
                  object-fit="cover"
                  style="width:100%; height: 160px;"
                  preview-disabled
                />
                <div class="image-overlay">
                  <n-button size="tiny" @click.stop="handleCopyImage(item)">复制图片</n-button>
                </div>
              </div>
              <div class="image-info">
                <span class="card-time">{{ relativeTime(item.timestamp) }}</span>
                <n-button size="tiny" quaternary @click="handleDeleteImage(item.id)" class="btn-delete">删除</n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========== 文件区域 ========== -->
        <div v-show="activeTab === 'file'">
          <n-empty v-if="fileList.length === 0" description="暂无文件记录" style="padding: 60px 0;" />
          <div v-else class="clip-list">
            <div v-for="item in fileList" :key="'f' + item.id" class="clip-card">
              <div class="card-top">
                <span class="file-icon">{{ getFileIcon(item.origin_name) }}</span>
                <span class="card-time">{{ relativeTime(item.timestamp) }}</span>
              </div>
              <div class="file-meta">
                <span class="file-name" :title="item.origin_name">{{ item.origin_name }}</span>
                <span v-if="item.size" class="file-size">{{ formatBytes(item.size) }}</span>
              </div>
              <div class="card-actions">
                <n-button size="tiny" @click="handleOpenFile(item.file_path)">打开文件</n-button>
                <n-button size="tiny" quaternary @click="handleDeleteFile(item.id)" class="btn-delete">删除</n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---------- box 容器（与其他页面协同） ---------- */
.box {
  flex: 1;
  border: 1px solid var(--new-color-border);
  min-width: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ---------- 工具栏（固定头部，类似 .box-title） ---------- */
.box-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-height: 50px;
  border-bottom: 1px solid var(--new-color-border);
  background-color: var(--color-background-mute);
  flex-shrink: 0;
}
.toolbar-hint {
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ---------- 分类标签（固定头部） ---------- */
.tabs-bar {
  flex-shrink: 0;
  padding: 0 14px;
  background: var(--color-background);
  border-bottom: 1px solid var(--new-color-border);
}

/* ---------- 可滚动内容区域 ---------- */
.box-card {
  overflow: hidden;
  overflow-y: auto;
  padding: 14px;
}

/* ---------- 文本列表（一行一个卡片，全文显示无抖动） ---------- */
.text-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-card {
  background: var(--color-background);
  border: 1px solid var(--new-color-border);
  border-radius: 8px;
  padding: 12px 16px;
  transition: box-shadow 0.25s, border-color 0.25s;
  cursor: default;
}
.text-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
}

.text-card .card-actions {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}
.text-card:hover .card-actions {
  opacity: 1;
  visibility: visible;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.card-body {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  word-break: break-all;
  margin-bottom: 8px;
  cursor: pointer;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-delete {
  color: #999;
}
.btn-delete:hover {
  color: #e88080 !important;
}

/* ---------- 图片网格 ---------- */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.image-card {
  border: 1px solid var(--new-color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.image-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.image-wrap {
  position: relative;
  line-height: 0;
}
.image-wrap:hover .image-overlay {
  opacity: 1;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
}

/* ---------- 文件 ---------- */
.file-icon {
  font-size: 20px;
  line-height: 1;
}
.file-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.file-name {
  font-size: 14px;
  color: var(--color-text);
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>
