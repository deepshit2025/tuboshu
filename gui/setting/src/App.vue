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

// Naive UI 主题覆盖 — shadcn 冷色调
const themeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1d4ed8',
    borderRadius: '6px',
    borderRadiusSmall: '4px',
  },
  Button: {
    borderRadius: '6px',
    fontSizeMedium: '14px',
    fontWeight: '500',
  },
  Card: {
    borderRadius: '6px',
  },
  Switch: {
    railColorActive: '#06b6d4',
  },
  Tag: {
    borderRadius: '4px',
  },
  Menu: {
    itemBorderRadius: '6px',
    itemHeight: '40px',
  },
  Input: {
    borderRadius: '6px',
  },
  Drawer: {
    borderRadius: '6px',
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
