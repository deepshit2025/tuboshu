<script setup>
// import { RouterLink, RouterView } from 'vue-router'
import LeftMenu from "@/components/LeftMenu.vue";
import {darkTheme} from "naive-ui";

const theme = ref({});
// 检测系统主题
const checkTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  theme.value = isDark ? darkTheme : {};
};

const handleChange = (e) => {
  checkTheme();
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
onMounted(() => {
  checkTheme(); // 初始化检测
  mediaQuery.addEventListener('change', handleChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleChange);
});

// Naive UI 主题覆盖 — 统一按钮色、卡片圆角等
const themeOverrides = {
  common: {
    primaryColor: '#2080f0',
    primaryColorHover: '#409eff',
    primaryColorPressed: '#1a6fd0',
    borderRadius: '8px',
    borderRadiusSmall: '4px',
  },
  Button: {
    borderRadius: '8px',
    fontSizeMedium: '14px',
  },
  Card: {
    borderRadius: '8px',
  },
  Switch: {
    railColorActive: '#10A37F',
  },
  Tag: {
    borderRadius: '4px',
  }
}

</script>

<template>
  <n-message-provider>
  <div id="left">
    <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <LeftMenu />
    </n-config-provider>
  </div>

  <div id="right">
    <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <RouterView />
    </n-config-provider>
  </div>
  </n-message-provider>

</template>

<style scoped>
#right{
  overflow: hidden;
}
</style>
