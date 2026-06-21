<script setup>
const props = defineProps({
    element: Object
})

const handleClick = () => {
  window.myApi.openSite(toRaw(props.element));
}
</script>

<template>
  <div class="wrap" @click="handleClick">
    <n-avatar
        round
        size="large"
        :src="element.img"
    />
    <span class="name">{{ element.tag }}</span>
  </div>
</template>

<style scoped>
.wrap {
  width: 80px;
  height: 80px;
  cursor: pointer;
  margin-top: 10px;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  place-items: center;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
}

.name{
  font-weight: bold;
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 5px;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;     /* 固定宽度与父容器一致 */
  text-align: center; /* 保持居中效果 */
  box-sizing: border-box; /* 包含padding */

}

.wrap:hover {
  background-color: var(--color-background-soft);
}

</style>
