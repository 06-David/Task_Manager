import { readonly, ref } from 'vue'

/**
 * 主题：同步 <html> 根类 + 首帧由 index.html 内联脚本处理（FR-09）
 * @param {{prefs: any, setTheme: (t: 'light'|'dark') => void, themeSource: any}} prefsApi
 */
export function useTheme(prefsApi) {
  const isDark = ref(false)

  function apply(theme) {
    isDark.value = theme === 'dark'
    const root = typeof document !== 'undefined' ? document.documentElement : null
    if (!root) return
    root.classList.toggle('dark', isDark.value)
  }

  apply(prefsApi.prefs.value.theme)

  function toggle() {
    prefsApi.setTheme(isDark.value ? 'light' : 'dark')
    apply(prefsApi.prefs.value.theme)
  }

  /**
   * 仅在用户尚未主动选择过主题时允许跟随系统（FR-09 规则 3/4）
   */
  function syncFromSystem() {
    if (prefsApi.themeSource?.value !== 'system') return
    apply(prefsApi.prefs.value.theme)
  }

  return { isDark: readonly(isDark), apply, toggle, syncFromSystem }
}
