import { readonly, ref } from 'vue'
import { DEFAULTS, STORAGE_KEYS } from '@/constants'
import { loadPrefs, savePrefs } from '@/models/storage'

/**
 * 偏好存储：主题与当前视图（FR-08 规则 2 / FR-09）
 * @returns {{
 *   prefs: import('vue').DeepReadonly<import('vue').Ref<import('@/types').Prefs>>,
 *   storageAvailable: import('vue').Ref<boolean>,
 *   themeSource: import('vue').Ref<'storage'|'system'>,
 *   setTheme: (t: 'light'|'dark') => void,
 *   toggleTheme: () => void,
 *   setActiveView: (v: 'list'|'board') => void,
 *   refresh: () => void,
 *   canWrite: () => boolean,
 * }}
 */
export function usePrefs() {
  const storage = resolveStorage()
  const storageAvailable = ref(storage !== null)
  const loaded = loadPrefs(storage)
  const prefs = ref({ ...loaded })
  const themeSource = ref(loaded.themeSource ?? 'system')

  function persist() {
    const result = savePrefs(storage, { ...prefs.value })
    if (!result.ok) storageAvailable.value = false
  }

  /**
   * 设置主题：首次主动切换才写入存储（FR-09 规则 3）
   * @param {'light'|'dark'} theme
   */
  function setTheme(theme) {
    prefs.value = { ...prefs.value, theme }
    themeSource.value = 'storage'
    persist()
  }

  function toggleTheme() {
    setTheme(prefs.value.theme === 'dark' ? 'light' : 'dark')
  }

  /**
   * @param {'list'|'board'} view
   */
  function setActiveView(view) {
    prefs.value = { ...prefs.value, activeView: view }
    persist()
  }

  /**
   * 其他标签页修改偏好后重新读取（FR-10 规则 5）
   */
  function refresh() {
    const next = loadPrefs(storage)
    prefs.value = { ...next }
  }

  return {
    prefs: readonly(prefs),
    storageAvailable,
    themeSource,
    setTheme,
    toggleTheme,
    setActiveView,
    refresh,
    canWrite: () => storageAvailable.value,
  }
}

/**
 * 解析可用存储对象；不可用时返回 null，由上层走内存态降级（FR-12-d）
 * @returns {Storage|null}
 */
export function resolveStorage() {
  try {
    if (typeof localStorage === 'undefined') return null
    const probeKey = `${STORAGE_KEYS.PREFS}:probe`
    localStorage.setItem(probeKey, '1')
    localStorage.removeItem(probeKey)
    return localStorage
  } catch {
    return null
  }
}

export const PREF_DEFAULTS = DEFAULTS
