<script setup>
import {ref} from 'vue';
import draggable from "vuedraggable"
import iconCancel from "@/components/icons/cancel.vue";
import iconSave from "@/components/icons/save.vue";
const message = useMessage();

const emit = defineEmits(['update:show', 'saveForm'])
const props = defineProps({
  element: Object,
  show: Boolean,
  list: Array
})

const title = ref('新增分组');
const list1 = ref([]);
const list2 = ref([]);
const tag = ref('');

const reComputed = (list, ele)=>{
  list1.value = [];
  list2.value = [];
  const sites = ele.sites.split(",").filter(Boolean);

  const listMap = new Map();
  list.forEach(item => {listMap.set(item.name, item);});
  list2.value = sites.map(name => listMap.get(name)).filter(Boolean);

  const siteSet = new Set(sites);
  list1.value = list.filter(item => !siteSet.has(item.name));
}

watch(() => props.element, (newVal) => {
  reComputed(JSON.parse(JSON.stringify(props.list)), newVal);
  tag.value = newVal.tag;
  title.value = !(newVal?.name) ? '新增分组' : '编辑站点'
}, { immediate: true })

const handleClose = () => {
  emit('update:show', false)
}

const handleSave = async () => {
  if (!tag.value) {
    return message.error("分组名称不能为空");
  }
  // if ((list2.value.length === 0)) {
  //   return message.error("分组下的站点不能为空");
  // }

  try{
    const sites = list2.value.map(item => item.name);
    const newEle = {tag: tag.value, sites: sites.join(',')};

    await window.myApi.updateGroup(Object.assign(toRaw(props.element), newEle))
    message.success("保存成功");
    emit('saveForm', newEle)
    emit('update:show', false)
  }catch (e){
    message.error("保存失败"+e)
  }
}

const updateOpenMenu = (e)=> {
  console.log('sites.value', list2.value);
}
</script>

<template>
  <n-drawer :show="show" @update:show="(value) => emit('update:show', value)" :width="502" placement="right">
    <n-drawer-content :title="title" closable>
      <div class="flex-row">
        <n-input type="text" size="large" placeholder="分组名称" v-model:value="tag" clearable />
      </div>

      <div class="box">
        <draggable
            class="list-group"
            :list="list2"
            group="site"
            @change="updateOpenMenu"
            itemKey="name"
        >
          <template #item="{element, index }">
            <GroupIcon :element="element" />
          </template>
        </draggable>
      </div>

      <div class="box">
        <draggable
            class="list-group list-all"
            :list="list1"
            group="site"
            itemKey="name"
        >
          <template #item="{ element, index }">
            <GroupIcon :element="element" />
          </template>
        </draggable>
      </div>

      <br />
      <n-alert :show-icon="false">
        <p style="color: var(--color-text-secondary);">
          可拖动添加或者删除分组内的站点<br />
          分组内的站点也可以拖动排序<br />
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
.box{
  margin-top: 1rem;
  flex: 1;
  border: 1px solid var(--color-border);
}
.list-group{
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  padding: 5px;
  gap: 5px;
  min-height: 120px;
  max-height: 200px;
  overflow-y: scroll;
}
.list-all{
  filter: grayscale(100%);
}

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
