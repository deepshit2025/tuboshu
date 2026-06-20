<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const message = useMessage()
const keyword = ref('')
const isWatchEnabled = ref(false)

const fullList = ref([])

// 客户端搜索：实时过滤
const textList = computed(() => {
  if (!keyword.value) return fullList.value
  const kw = keyword.value.toLowerCase()
  return fullList.value.filter(item => item.content.toLowerCase().includes(kw))
})

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

function isUrl(text) {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}

// 搜索高亮：用绿色加粗 <span> 包裹关键词
function highlightText(text) {
  if (!keyword.value) return escapeHtml(text)
  const kw = keyword.value.trim()
  if (!kw) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedKw = escapeHtml(kw)
  const regex = new RegExp(`(${escapedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<span class="highlight">$1</span>')
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ---------- 数据加载 ----------
const loadText = async () => {
  try {
    fullList.value = await window.myApi.getClipboardHistory('')
  } catch {}
}

const handleSearch = () => {
  // 客户端已实时过滤，无需额外操作
}

// ---------- 文本操作 ----------
const handleCopy = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const handleDeleteText = async (id) => {
  try {
    await window.myApi.deleteClipboardRecord(id)
    fullList.value = fullList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

const handleOpenUrl = (url) => {
  window.myApi.openLinkInBrowser(url)
}

// ---------- 清空 ----------
const handleClear = async () => {
  if (!window.confirm('确定要清空所有剪贴板记录吗？此操作不可恢复。')) return
  await window.myApi.clearClipboardHistory()
  fullList.value = []
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
  await loadText()
  try {
    const settings = await window.myApi.getSettings()
    const item = settings.find(s => s.name === 'clipboardWatchEnabled')
    if (item) isWatchEnabled.value = item.value
  } catch {}

  pollTimer = setInterval(() => {
    if (document.hidden) return
    loadText()
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
          {{ isWatchEnabled ? '监控中，自动记录剪贴板内容' : '开启后自动记录剪贴板内容' }}
        </span>

        <div class="toolbar-right">
          <n-input
            size="small"
            v-model:value="keyword"
            placeholder="搜索剪贴板内容..."
            clearable
            style="width: 200px;"
          >
            <template #prefix>
              <n-icon size="14"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></n-icon>
            </template>
          </n-input>

          <n-button size="tiny" ghost @click="handleClear">清空</n-button>
        </div>
      </div>

      <!-- ========== 可滚动内容区域 ========== -->
      <div class="box-card" v-auto-height="{ offset: 20 }">
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
            <div class="card-body" v-html="highlightText(item.content)"></div>
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

/* ---------- 可滚动内容区域 ---------- */
.box-card {
  overflow: hidden;
  overflow-y: auto;
  padding: 14px;
}

/* ---------- 文本列表 ---------- */
.text-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-card {
  background: var(--color-background);
  border: 1px solid var(--new-color-border);
  border-radius: 8px;
  padding: 6px 16px;
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
  margin-bottom: 4px;
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
  margin-bottom: 4px;
  cursor: pointer;
}
.card-body :deep(.highlight) {
  color: #22c55e;
  font-weight: 700;
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
</style>
