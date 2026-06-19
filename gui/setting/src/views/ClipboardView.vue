<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const message = useMessage()
const keyword = ref('')
const loading = ref(false)
const isWatchEnabled = ref(false)
const activeTab = ref('text')

// 文本
const textList = ref([])
// 图片
const imageList = ref([])
// 文件
const fileList = ref([])

let pollTimer = null

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

const loadAll = async () => {
  loading.value = true
  await Promise.all([loadText(), loadImages(), loadFiles()])
  loading.value = false
}

const handleSearch = () => {
  loadText()
}

// 文本操作
const handleDeleteText = async (id) => {
  try {
    await window.myApi.deleteClipboardRecord(id)
    textList.value = textList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

const handleCopy = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

// 图片操作
const handleDeleteImage = async (id) => {
  try {
    await window.myApi.deleteClipboardImage(id)
    imageList.value = imageList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

// 文件操作
const handleDeleteFile = async (id) => {
  try {
    await window.myApi.deleteClipboardFile(id)
    fileList.value = fileList.value.filter(item => item.id !== id)
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

const handleToggleWatch = async (val) => {
  try {
    await window.myApi.toggleClipboardWatch(val)
    isWatchEnabled.value = val
    message.success(val ? '剪贴板监控已开启' : '剪贴板监控已关闭')
  } catch (e) {
    message.error('操作失败: ' + e)
  }
}

const formatTime = (ts) => {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

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

    <n-card embedded :bordered="true" style="margin-bottom: 1rem;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <n-switch size="medium" :value="isWatchEnabled" @update:value="handleToggleWatch">
          <template #checked>监控中</template>
          <template #unchecked>已关闭</template>
        </n-switch>
        <span style="font-size: 13px; color: #888;">
          {{ isWatchEnabled ? '后台自动识别文本/图片/文件并分类记录' : '开启后将自动记录剪贴板内容' }}
        </span>
      </div>
    </n-card>

    <!-- 分类标签 -->
    <n-tabs type="line" v-model:value="activeTab" style="margin-bottom: 12px;">
      <n-tab name="text" tab="文本" :disabled="textList.length === 0">文字 ({{ textList.length }})</n-tab>
      <n-tab name="image" tab="图片" :disabled="imageList.length === 0">图片 ({{ imageList.length }})</n-tab>
      <n-tab name="file" tab="文件" :disabled="fileList.length === 0">文件 ({{ fileList.length }})</n-tab>
    </n-tabs>

    <!-- 文本区域 -->
    <n-card v-show="activeTab === 'text'" embedded :bordered="true">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <n-input-group>
          <n-input
            size="small"
            v-model:value="keyword"
            placeholder="搜索剪贴板内容..."
            :style="{ width: '300px' }"
            @keyup.enter="handleSearch"
            clearable
          />
          <n-button size="small" @click="handleSearch">搜索</n-button>
        </n-input-group>
      </div>

      <n-spin :show="loading">
        <n-empty v-if="!loading && textList.length === 0" description="暂无文本记录" style="padding: 40px;" />
        <n-list v-else>
          <n-list-item v-for="item in textList" :key="'t'+item.id">
            <template #prefix>
              <div class="item-time">{{ formatTime(item.timestamp) }}</div>
            </template>
            <div class="item-content">{{ item.content }}</div>
            <template #suffix>
              <n-button size="tiny" @click="handleCopy(item.content)" style="margin-right: 6px;">复制</n-button>
              <n-button size="tiny" tertiary round @click="handleDeleteText(item.id)">✕</n-button>
            </template>
          </n-list-item>
        </n-list>
      </n-spin>
    </n-card>

    <!-- 图片区域 -->
    <n-card v-show="activeTab === 'image'" embedded :bordered="true">
      <n-spin :show="loading">
        <n-empty v-if="!loading && imageList.length === 0" description="暂无图片记录" style="padding: 40px;" />
        <div v-else class="image-grid">
          <div v-for="item in imageList" :key="'i'+item.id" class="image-item">
            <img :src="item.dataUrl" class="image-thumb" @click="handleCopy(item.dataUrl)" />
            <div class="image-info">
              <span class="item-time">{{ formatTime(item.timestamp) }}</span>
              <n-button size="tiny" tertiary round @click="handleDeleteImage(item.id)">✕</n-button>
            </div>
          </div>
        </div>
      </n-spin>
    </n-card>

    <!-- 文件区域 -->
    <n-card v-show="activeTab === 'file'" embedded :bordered="true">
      <n-spin :show="loading">
        <n-empty v-if="!loading && fileList.length === 0" description="暂无文件记录" style="padding: 40px;" />
        <n-list v-else>
          <n-list-item v-for="item in fileList" :key="'f'+item.id">
            <template #prefix>
              <div class="item-time">{{ formatTime(item.timestamp) }}</div>
            </template>
            <div class="item-content">{{ item.origin_name || item.file_path }}</div>
            <template #suffix>
              <n-button size="tiny" tertiary round @click="handleDeleteFile(item.id)">✕</n-button>
            </template>
          </n-list-item>
        </n-list>
      </n-spin>
    </n-card>
  </div>
</template>

<style scoped>
.item-time {
  white-space: nowrap;
  font-size: 12px;
  color: #888;
  min-width: 140px;
}
.item-content {
  word-break: break-all;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.image-item {
  border: 1px solid var(--new-color-border);
  border-radius: 4px;
  overflow: hidden;
}
.image-thumb {
  width: 100%;
  height: 140px;
  object-fit: cover;
  cursor: pointer;
  display: block;
}
.image-thumb:hover {
  opacity: 0.85;
}
.image-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  font-size: 12px;
}
</style>
