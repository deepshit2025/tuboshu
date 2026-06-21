<script setup>
import {onMounted, ref} from 'vue';
import iconAddNew from "@/components/icons/addNew.vue";
import GroupDrawer from "@/components/GroupDrawer.vue";
const message = useMessage();

const list  = ref([]);
const listData = ref([]);
const show = ref(false);
const ele = ref({tag:'', sites:'', isOpen:false});


const initData = async() => {
  try{
    list.value =  (await window.myApi.getConfig()).openMenus;
    listData.value = await window.myApi.getGroups();
  }catch (e) {
    message.error("读取配置文件失败"+e);
  }
};

onMounted(async () => {
  await initData();
});

const addNew = () => {
  ele.value = {tag:'', sites:'', isOpen:false};
  show.value = true;
};

const handleEdit = (element)=>{
  ele.value = JSON.parse(JSON.stringify(element));
  show.value = true;
};

const handleRemove = async (element)=>{
  try{
    await window.myApi.removeGroup(toRaw(element));
    message.success("删除成功");
  }catch (e){
    message.error("删除失败"+e);
  }
  await initData();
};

const handleSaveForm = async (data)=>{
  await initData();
};
</script>

<template>
  <div id="content-main">

    <n-alert :show-icon="false" type="info" style="margin-bottom: 1rem;">
      <n-h3 style="margin-bottom: 0;">站点分组</n-h3>
    </n-alert>

    <n-alert :show-icon="false">
      1.没有创建或启用分组时，默认为全部站点;<br/>
      2.拖动站点图标可排序；
    </n-alert>


    <div class="box">
      <div class="box-title">
        <n-button type="primary" @click="addNew">
          <template #icon>
            <n-icon color="#fff"> <iconAddNew /></n-icon>
          </template>
          添加分组
        </n-button>
      </div>

      <div class="box-card" v-auto-height="{ offset: 20}">
        <div class="wrap">
          <template v-for="element in listData"  v-if="listData && listData.length > 0">
            <GroupItem :element="element" :list="list" @edit="handleEdit" @remove="handleRemove" @change="handleSaveForm" />
          </template>
          <div v-else style="color: var(--color-text-tertiary);font-size:14px;">没有分组数据</div>
        </div>
      </div>

    </div>
  </div>
  <GroupDrawer v-model:show="show" :element="ele" :list="list" @saveForm="handleSaveForm" />
</template>

<style scoped>
.box{
  margin-top: 1rem;
  flex: 1;
  border: 1px solid var(--new-color-border);
  min-width: 500px;
  overflow: hidden;
}
.box-title{
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  padding: 0.5em;
  border-bottom: 1px solid var(--new-color-border);
  background-color: var(--color-background-mute);
}

.box-card{
  overflow: hidden;
  overflow-y: scroll;
}

.wrap{
  padding: 0.5em;
}

</style>