<script setup>
const props = defineProps({
    element: Object
})
</script>

<template>
  <div class="wrap-box">
    <n-avatar
        round
        size="medium"
        :src="element.img"
    />
    <span class="name">{{ element.tag }}</span>
  </div>
</template>

<style scoped>
.wrap-box {
  padding: 5px;
  width: 70px;
  height: 70px;
  overflow: hidden;
  cursor: move;
  display: flex;
  flex-direction: column;
  justify-content: center;
  place-items: center;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.name{
  color: var(--color-text);
  font-size: 12px;
  padding: 2px;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;
  text-align: center;
  box-sizing: border-box;

}

.wrap-box:hover {
  background-color: var(--color-background-mute);
}

</style>
