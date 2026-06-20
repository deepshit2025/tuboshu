<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const plugins = ref([])
const loading = ref(false)

onMounted(async () => {
  await loadPlugins()
})

async function loadPlugins() {
  loading.value = true
  try {
    plugins.value = await window.myApi.getPlugins()
  } catch (e) {
    message.error('加载插件列表失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function handleToggle(plugin) {
  const newEnabled = !plugin.enabled
  try {
    await window.myApi.togglePlugin(plugin.id, newEnabled)
    plugin.enabled = newEnabled
    message.success(`插件「${plugin.name}」已${newEnabled ? '启用' : '禁用'}，更改将在新建页面时生效`)
  } catch (e) {
    message.error('操作失败: ' + e.message)
  }
}

async function handleInstallLocal() {
  try {
    const result = await window.myApi.installLocalPlugin()
    if (result.success) {
      message.success('插件安装成功')
      await loadPlugins()
    } else if (result.error && result.error !== '已取消') {
      message.error('安装失败: ' + result.error)
    }
  } catch (e) {
    message.error('安装失败: ' + e.message)
  }
}

async function handleUninstall(plugin) {
  try {
    const result = await window.myApi.uninstallPlugin(plugin.id)
    if (result.success) {
      message.success(`插件「${plugin.name}」已卸载`)
      await loadPlugins()
    } else {
      message.error('卸载失败: ' + (result.error || '未知错误'))
    }
  } catch (e) {
    message.error('卸载失败: ' + e.message)
  }
}
</script>

<template>
  <div id="content-main">
    <n-alert :show-icon="false" type="info" style="margin-bottom: 1rem;">
      <n-h3 style="margin-bottom: 0;">插件市场</n-h3>
    </n-alert>

    <n-alert :show-icon="false" type="warning" style="margin-bottom: 1rem;">
      插件的启用/禁用状态更改将在<strong>新建页面</strong>时生效，已打开的页面不受影响。
    </n-alert>

    <div style="margin-bottom: 1rem;">
      <n-button type="primary" @click="handleInstallLocal">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </template>
        从本地导入插件
      </n-button>
    </div>

    <n-spin :show="loading">
      <div v-if="plugins.length === 0 && !loading" style="text-align: center; padding: 2rem; color: #999;">
        暂无插件
      </div>

      <n-space vertical size="medium">
        <n-card v-for="plugin in plugins" :key="plugin.id" embedded :bordered="true" size="small">
          <div class="plugin-card">
            <div class="plugin-info">
              <div class="plugin-name">
                {{ plugin.name }}
                <n-tag v-if="plugin.type === 'built-in'" size="tiny" type="info" bordered>内置</n-tag>
                <n-tag v-else size="tiny" type="success" bordered>本地</n-tag>
              </div>
              <div class="plugin-desc">{{ plugin.description || '暂无描述' }}</div>
              <div class="plugin-meta">
                <span>版本: {{ plugin.version || '-' }}</span>
                <span v-if="plugin.author"> | 作者: {{ plugin.author }}</span>
              </div>
            </div>
            <div class="plugin-actions">
              <n-switch
                :value="plugin.enabled"
                @update:value="handleToggle(plugin)"
                size="medium"
              >
                <template #checked>已启用</template>
                <template #unchecked>已禁用</template>
              </n-switch>
              <n-button
                v-if="plugin.type !== 'built-in'"
                size="small"
                type="error"
                secondary
                @click="handleUninstall(plugin)"
              >
                卸载
              </n-button>
            </div>
          </div>
        </n-card>
      </n-space>
    </n-spin>
  </div>
</template>

<style scoped>
.plugin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.plugin-info {
  flex: 1;
  min-width: 0;
}
.plugin-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.plugin-desc {
  font-size: 13px;
  color: #888;
  margin-bottom: 2px;
}
.plugin-meta {
  font-size: 12px;
  color: #aaa;
}
.plugin-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
</style>
