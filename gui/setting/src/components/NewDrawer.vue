<script setup>
import iconCancel from "@/components/icons/cancel.vue";
import iconSave from "@/components/icons/save.vue";

const message = useMessage();
const props = defineProps({
  element: Object,
  show: Boolean
})

const uploader = ref(null)
const formData = reactive({tag: '', url: '', proxy:''})
watch(() => props.element, (newVal) => {
  Object.assign(formData, newVal || {})
}, { immediate: true })

const emit = defineEmits(['update:show', 'saveForm'])
const title =  computed(()=>{
  return props.element.isNew !== false ? '新增站点' : '编辑站点'
})

const handleClose = () => {
  emit('update:show', false)
}
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
const handleSave = () => {
  if (!formData.tag) {
    return message.error("标签名称不能为空");
  }
  if (!isValidUrl(formData.url)) {
    return message.error("请输入合法 URL");
  }
  formData.img = uploader.value.getUrl();
  emit('saveForm',  JSON.parse(JSON.stringify(formData)))
  emit('update:show', false)
  return message.success("保存成功");
}
</script>

<template>
  <n-drawer :show="show" @update:show="(value) => emit('update:show', value)" :width="502" placement="right">
    <n-drawer-content :title="title" closable>
      <div class="flex-row">
        <ImageUpload ref="uploader" :imgUrl="element.img" />
        <n-input type="text" placeholder="标签名称" v-model:value="formData.tag" clearable />
      </div>

      <div class="flex-row" style="margin-top: 30px">
        <n-input type="text" size="large" placeholder="网页地址 https://" v-model:value="formData.url" clearable />
      </div>

      <div class="flex-row" style="margin-top: 30px">
        <n-input type="text" size="large" placeholder="设置代理 (非必要勿填)" v-model:value="formData.proxy" clearable />
      </div>

      <br>
      <n-alert :show-icon="false">
        <p style="color: var(--color-text-secondary);">
          代理格式规则:<br>
          HTTP/HTTPS 代理：http://host:port <br>
          SOCKS 代理：socks://host:port<br>
          SOCKS5 代理：socks5://host:port<br>
          支持认证：socks5://user:password@host:port<br>
        </p>
      </n-alert>

      <template #footer>
        <div class="flex-footer">
          <n-button @click="handleClose">
            <template #icon>
              <n-icon color="#fff"> <iconCancel /> </n-icon>
            </template>
            取消
          </n-button>

          <n-button type="primary" @click="handleSave">
            <template #icon>
              <n-icon color="#fff"> <iconSave /></n-icon>
            </template>
            保存
          </n-button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.flex-row{
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-end;
}

.flex-footer{
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
}
</style>
