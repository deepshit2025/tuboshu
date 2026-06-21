<script setup>
import iconCancel from "@/components/icons/cancel.vue";
import iconSave from "@/components/icons/save.vue";

const message = useMessage();
const props = defineProps({
  element: Object,
  show: Boolean
})

const jsTitle = computed(()=>{
  return props.element.tag + '_' +props.element.url
})

const jsValue = ref('')
watch(() => props.element, (newVal) => {
  jsValue.value = newVal.jsCode
}, { immediate: true })


const emit = defineEmits(['update:show', 'saveJsCode'])
const handleClose = () => {
  emit('update:show', false)
}

const handleSave = () => {
  let ele = JSON.parse(JSON.stringify(props.element))
  emit('saveJsCode', Object.assign(ele,{jsCode:jsValue.value}))
  emit('update:show', false)
  return message.success("保存成功");
}
</script>

<template>
  <n-drawer
      :show="show" @update:show="(value) => emit('update:show', value)"
      :default-width="502"
      placement="right"
      resizable >

    <n-drawer-content :title="jsTitle" closable>
      <div class="flex-row">
          <n-input
              v-auto-height="{ offset: 90}"
              v-model:value="jsValue"
              type="textarea"
              placeholder="JS代码"
          />
      </div>

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
