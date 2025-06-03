<template>
  <n-config-provider :theme="theme === 'dark' ? darkTheme : null" :theme-overrides="theme === 'dark' ? darkThemeOverrides : lightThemeOverrides" :style="{ width: '100%' }">
    <n-dialog-provider>
      <n-message-provider>
        <slot />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
<script lang="ts" setup>
import { inject, onUnmounted, ref } from 'vue'
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import { Textbus } from '@textbus/core'
import { darkThemeOverrides, lightThemeOverrides } from './theme/_api'
import { ThemeProvider } from '../plugins/theme/theme.plugin'
const injector = inject<Textbus>('textbus')
const themeProvider = injector?.get(ThemeProvider)
const theme = ref(themeProvider?.theme)
const sub = themeProvider?.onThemeUpdate.subscribe(themeState => theme.value = themeState)
onUnmounted(() => {
  sub?.unsubscribe()
})
</script>

<style scoped></style>
