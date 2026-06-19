<script setup>
import { ref, onMounted, toRaw } from 'vue';
import NewDrawer from "@/components/NewDrawer.vue";
import JsEditorDrawer from "@/components/JsEditorDrawer.vue";
import iconAddNew from "@/components/icons/addNew.vue";

const message = useMessage();
const ele = ref({});
const show = ref(false);
const list = ref([]);

const isJsEditor = ref(false);
const jsElement = ref({});

const initData = async () => {
  const config = await window.myApi.getConfig();
  list.value = [...config.openMenus, ...config.closeMenus];
};

onMounted(async () => {
  await initData()
});

const addNew = () => {
  ele.value = {tag: '', url: '', name:'', proxy:'', isOpen: true, isNew: true};
  show.value = true;
};

const handleEdit = (element) => {
  if(!Object.hasOwn(element, 'proxy')){
    element.proxy = "";
  }
  element.isNew = false;
  ele.value = JSON.parse(JSON.stringify(element));
  show.value = true;
};

const handleRemove = (element) => {
  const index = list.value.findIndex(item => item.name === element.name);
  if (index !== -1) {
    list.value.splice(index, 1);
  }
  window.myApi.removeMenu(toRaw(element));
};

const handleClone = async (element) => {
  const newElement = {
      tag: element.tag + '-copy',
     name: element.url,
      url: element.url,
      img: element.img,
    isOpen:true
  }
  window.myApi.addMenu(newElement)
  await initData()
  message.success('克隆成功');
};

const handleSaveForm = async (element) => {
  if(element.isNew === true){
    element.isNew = false;
    element.name = element.url;
    list.value.unshift(element)
    window.myApi.addMenu(toRaw(element))
  }else{
    list.value.forEach(item => {
      if (item.name === element.name) {
        Object.assign(item, element);
        window.myApi.updateMenu(toRaw(item))
      }
    })
  }
  await initData()
};

const handleJsEditor = (name) => {
  const index = list.value.findIndex(item => item.name === name);
  const objItem = list.value[index];
  if(!Object.hasOwn(objItem, 'jsCode')) objItem.jsCode = '';
  jsElement.value = objItem;
  isJsEditor.value = true;
};

const handleSaveJsCode = (element) => {
  const index = list.value.findIndex(item => item.name === element.name);
  list.value[index] = element;
  window.myApi.updateMenu(toRaw(element));
};

const handleExportConfig = async () => {
  try{
    const ret = await window.myApi.exportConfig();
    if(ret === true) message.success('导出站点文件成功');
  }catch (error) {
    message.error('导出失败：'+error);
  }

};

const handleImportConfig = async () => {
  try{
    const ret = await window.myApi.importConfig();
    await initData();
    if(ret != null) message.success(`成功导入${ret}个站点`);
  }catch (error) {
    message.error('导入失败：'+error);
  }

};

</script>

<template>
  <div id="content-main">
      <n-alert :show-icon="false" type="info" style="margin-bottom: 1rem;">
        <n-h3 style="margin-bottom: 0;">设置站点</n-h3>
      </n-alert>

    <n-alert :show-icon="false">
      1.点击“新增站点”，可自行添加站点，也可修改或者删除站点；<br>
      2.相同网站的站点多次添加，即可实现多开效果。<br>
    </n-alert>

    <div class="box">
      <div class="box-title">
          <n-button color="#2080f0" @click="addNew">
          <template #icon>
            <n-icon color="#fff">
              <iconAddNew />
            </n-icon>
          </template>
          新增站点
        </n-button>

        <n-button @click="handleExportConfig" class="export-btn">导出</n-button>
        <n-button @click="handleImportConfig" class="import-btn">导入</n-button>

      </div>
      <div class="box-card" v-auto-height="{ offset: 20}">
        <div class="wrap">
          <template v-for="element in list">
            <LinkItem :element="element" @edit="handleEdit" @remove="handleRemove" @clone="handleClone" @jsEditor="handleJsEditor" />
          </template>
        </div>
      </div>
    </div>
  </div>

  <NewDrawer v-model:show="show" :element="ele" @saveForm="handleSaveForm" />
  <JsEditorDrawer v-model:show="isJsEditor" :element="jsElement" @saveJsCode="handleSaveJsCode" />
</template>

<style scoped>
.box{
  margin-top: 1rem;
  flex: 1;
  border: 1px solid var(--new-color-border);
  min-width: 600px;
  overflow: hidden;
}

.box-card{
  overflow: hidden;
  overflow-y: scroll;
}

.wrap{
  padding: 0.5em;
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
.export-btn{
  margin-left: auto;
}

</style>