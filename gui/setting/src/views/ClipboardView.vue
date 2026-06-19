<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const message = useMessage()
const list = ref([])
const keyword = ref('')
const loading = ref(false)
const isWatchEnabled = ref(false)
let pollTimer = null

const loadData = async () => {
  try {
    list.value = await window.myApi.getClipboardHistory(keyword.value)
  } catch (e) {
    // 静默处理
  }
}

const handleSearch = () => {
  loadData()
}

const handleDelete = async (id) => {
  try {
    await window.myApi.deleteClipboardRecord(id)
    list.value = list.value.filter(item => item.id !== id)
    message.success('已删除')
  } catch (e) {
    message.error('删除失败: ' + e)
  }
}

const handleCopy = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
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
  await loadData()
  // 读取当前启用的状态
  try {
    const settings = await window.myApi.getSettings()
    const item = settings.find(s => s.name === 'clipboardWatchEnabled')
    if (item) isWatchEnabled.value = item.value
  } catch {}

  // 页面活跃时每 2 秒轮询新内容
  pollTimer = setInterval(() => {
    if (document.hidden) return
    loadData()
  }, 2000)
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
      <div class="toolbar">
        <n-switch size="medium" :value="isWatchEnabled" @update:value="handleToggleWatch">
          <template #checked>监控中</template>
          <template #unchecked>已关闭</template>
        </n-switch>
        <span style="font-size: 13px; color: #888;">
          {{ isWatchEnabled ? '正在后台记录剪贴板变化，关闭后停止记录' : '开启后将自动记录剪贴板内容' }}
        </span>
      </div>
    </n-card>

    <n-card embedded :bordered="true">
      <div class="toolbar">
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
        <n-empty v-if="!loading && list.length === 0" description="暂无剪贴板记录" style="padding: 40px;" />

        <n-list v-else>
          <n-list-item v-for="item in list" :key="item.id">
            <template #prefix>
              <div class="item-time">{{ formatTime(item.timestamp) }}</div>
            </template>
            <div class="item-content">{{ item.content }}</div>
            <template #suffix>
              <n-button size="tiny" @click="handleCopy(item.content)" style="margin-right: 6px;">复制</n-button>
              <n-button size="tiny" tertiary round @click="handleDelete(item.id)">✕</n-button>
            </template>
          </n-list-item>
        </n-list>
      </n-spin>
    </n-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
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
</style>
