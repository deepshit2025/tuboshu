<script setup>
import { ref, onMounted } from 'vue'

const message = useMessage()
const list = ref([])
const keyword = ref('')
const loading = ref(false)
const isWatchEnabled = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    list.value = await window.myApi.getClipboardHistory(keyword.value)
  } catch (e) {
    message.error('加载失败: ' + e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  loadData()
}

const handleClear = async () => {
  const confirmed = confirm('确定清空所有剪贴板历史吗？')
  if (!confirmed) return
  try {
    await window.myApi.clearClipboardHistory()
    list.value = []
    message.success('已清空')
  } catch (e) {
    message.error('清空失败: ' + e)
  }
}

const handleCopy = (content) => {
  navigator.clipboard.writeText(content).then(() => {
    message.success('已复制到剪贴板')
  })
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
  await loadData()
  // 读取当前启用的状态（通过 getSettings 获取）
  try {
    const settings = await window.myApi.getSettings()
    const item = settings.find(s => s.name === 'clipboardWatchEnabled')
    if (item) isWatchEnabled.value = item.value
  } catch {}
})
</script>

<template>
  <div id="content-main">
    <n-alert :show-icon="false" type="info" style="margin-bottom: 1rem;">
      <n-h3 style="margin-bottom: 0;">剪贴板历史</n-h3>
    </n-alert>

    <div class="toolbar">
      <div class="toolbar-left">
        <n-switch size="medium" :value="isWatchEnabled" @update:value="handleToggleWatch">
          <template #checked>监控中</template>
          <template #unchecked>已关闭</template>
        </n-switch>
        <span style="margin-left: 8px; font-size: 13px; color: #888;">
          {{ isWatchEnabled ? '正在后台记录剪贴板变化' : '关闭后停止记录' }}
        </span>
      </div>
    </div>

    <div class="toolbar" style="margin-top: 8px;">
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

      <n-button size="small" style="margin-left: auto;" @click="handleClear">清空记录</n-button>
    </div>

    <div class="card-box">
      <n-spin :show="loading">
        <n-empty v-if="!loading && list.length === 0" description="暂无剪贴板记录" style="padding: 40px;" />

        <div v-for="item in list" :key="item.id" class="clipboard-item">
          <div class="item-time">{{ formatTime(item.timestamp) }}</div>
          <div class="item-content">{{ item.content }}</div>
          <n-button size="tiny" @click="handleCopy(item.content)">复制</n-button>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
}
.card-box {
  border: 1px solid var(--new-color-border);
  border-radius: 4px;
  overflow: hidden;
  overflow-y: auto;
  max-height: calc(100vh - 220px);
}
.clipboard-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--new-color-border);
  transition: background 0.15s;
}
.clipboard-item:hover {
  background: var(--color-background-mute);
}
.clipboard-item:last-child {
  border-bottom: none;
}
.item-time {
  white-space: nowrap;
  font-size: 12px;
  color: #888;
  min-width: 140px;
  padding-top: 2px;
}
.item-content {
  flex: 1;
  word-break: break-all;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
}
</style>
