<script setup>
import iconOptions from "./icons/options.vue"
import iconJseditor from "./icons/jseditor.vue"
import iconRefresh from "./icons/refresh.vue"
import iconDragHandle from "./icons/dragHandle.vue"

const message = useMessage();
const props = defineProps({
  element: Object
})

const svgIcon = ref(null);
const icon = ref('');
watch(() => props.element, (newVal) => {
  icon.value = newVal.img
}, { immediate: true })

const show = ref(false);
const options = [
  {
    label: "克隆",
    key: "clone"
  },
  {
    label: "修改",
    key: "modify"
  },
  {
    label: "删除",
    key: "remove"
  }
];

const emit = defineEmits(['edit', 'remove', 'jsEditor'])


const handleClickOpenSite = ()=>{
  if(!props.element.isOpen) return;
  window.myApi.openSite(toRaw(props.element));
};

const handleSelect = (key) => {
   if(key === 'modify'){
      emit('edit', props.element)
   }else if(key === 'clone'){
      emit('clone', props.element)
   }else{
      emit('remove', props.element)
   }
};
const handleClick = ()=> {
  show.value = !show.value;
};

const handleClickJsEditor = ()=>{
  emit('jsEditor', props.element.name)
}

const changeSwitch = (val)=>{
  let menu = Object.assign(toRaw(props.element), { isOpen: val});
  window.myApi.updateMenu(menu);
}

const handleClickGetIcon = ()=>{
  if(icon.value.endsWith('ZP8EQEcFCACPFvgAAAAASUVORK5CYII=')){
    window.myApi.getFavicon(props.element.name).then((res)=>{
        if(res.ret === 0){
          icon.value = res.data;
          message.success('获取成功')
          stopAnimation()
        }else{
          message.error(res.data)
          stopAnimation()
        }
      }
    )
  }else{
    message.info('已存在图标,无需获取')
    stopAnimation()
  }
}

const stopAnimation = ()=>{
  if(svgIcon.value){
    svgIcon.value.stopAnimation()
  }
}


</script>

<template>
  <div class="wrap">
    <div class="drag-handle">
      <n-icon size="22"><iconDragHandle /></n-icon>
    </div>
    <n-avatar @click="handleClickOpenSite" round width="40" :src="icon"/>
    <div class="link">
      <div> {{ element.tag }}</div>
      <div class="link-url"> {{ element.url }}</div>
    </div>

    <div class="getIcon">
      <n-popover trigger="hover">
        <template #trigger>
          <span @click="handleClickGetIcon">
           <n-icon size="30"> <iconRefresh ref="svgIcon" /></n-icon>
          </span>
        </template>
        <span>点击自动获取图标</span>
      </n-popover>
    </div>

    <div class="jseditor">
      <n-popover trigger="hover">
        <template #trigger>
          <span @click="handleClickJsEditor">
            <n-icon size="30"> <iconJseditor /></n-icon>
          </span>
        </template>
        <span>页面注入JS代码</span>
      </n-popover>
    </div>

    <div class="options">
      <n-dropdown trigger="click" :options="options" @select="handleSelect">
        <span @click="handleClick">
          <n-icon size="30"> <iconOptions /> </n-icon>
        </span>
      </n-dropdown>
    </div>

    <div class="switch">
      <n-switch size="medium" v-model:value="element.isOpen" @update:value="changeSwitch" style="font-size:12px;" >
        <template #checked>开启</template>
        <template #unchecked>关闭</template>
      </n-switch>
   </div>
  </div>
</template>

<style scoped>
.wrap {
  background-color: var(--color-background);
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  place-items: center;
  border-bottom: 1px solid var(--new-color-border);
  gap: 10px;
}
.drag-handle {
  cursor: grab;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 40px;
  flex-shrink: 0;
  color: var(--color-text);
  opacity: 0.4;
  transition: opacity 0.2s;
}
.drag-handle:active {
  cursor: grabbing;
}
.wrap:hover .drag-handle {
  opacity: 0.8;
}
.link{
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
}

.link-url{
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 260px;
  min-width: 250px;
}
.getIcon{
  width: 60px;
  text-align: center;
  flex-shrink: 0;
  margin-left: auto;
}

.jseditor{
  width: 60px;
  text-align: center;
  flex-shrink: 0;
}
.options{
  width: 60px;
  text-align: center;
  flex-shrink: 0;
}

.jseditor>span, .options>span, .getIcon>span{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 50%;
  transition: background-color 0.3s;
  cursor: pointer;
}

.jseditor >span:hover, .options>span:hover, .getIcon>span:hover{
  background-color: var(--color-border);
  box-shadow: 0 0 2px var(--color-text)
}

.switch{
  text-align: right;
  vertical-align: center;
  width: 80px;
  flex-shrink: 0;
}

.wrap:hover {
  background-color: var(--color-background-soft);
}
</style>
