import { DEFAULTS, SCHEMA_VERSION, STORAGE_KEYS } from '@/constants'
import { normalizeTask } from './taskFactory'

/**
 * 读取并解析存储信封，处理 JSON 损坏与 schema 版本兜底（FR-10 规则 7 / FR-12-e/f）
 * @param {Storage|null} storage
 * @param {string} key
 * @returns {{ok: boolean, data: any, reason: null|'unavailable'|'corrupt'|'future'}}
 */
export function readEnvelope(storage, key) {
  if (!storage) return { ok: false, data: null, reason: 'unavailable' }

  let raw
  try {
    raw = storage.getItem(key)
  } catch {
    return { ok: false, data: null, reason: 'unavailable' }
  }
  if (raw === null) return { ok: true, data: null, reason: null }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    backupRaw(storage, raw)
    return { ok: false, data: null, reason: 'corrupt' }
  }

  if (!parsed || typeof parsed !== 'object' || typeof parsed.schemaVersion !== 'number') {
    backupRaw(storage, raw)
    return { ok: false, data: null, reason: 'corrupt' }
  }

  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, data: parsed.data ?? null, reason: 'future' }
  }

  backupRaw(storage, raw)
  return { ok: true, data: parsed.data ?? null, reason: null }
}

/**
 * 备份原始字符串（FR-12-e）
 * @param {Storage} storage
 * @param {string} raw
 */
function backupRaw(storage, raw) {
  try {
    storage.setItem(STORAGE_KEYS.BACKUP, raw)
  } catch {
    /* 备份失败不阻断主流程 */
  }
}

/**
 * 写入存储信封（FR-10 规则 3）
 * @param {Storage|null} storage
 * @param {string} key
 * @param {any} data
 * @returns {{ok: boolean, reason: null|'unavailable'|'quota'}}
 */
export function writeEnvelope(storage, key, data) {
  if (!storage) return { ok: false, reason: 'unavailable' }
  try {
    storage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data }))
    return { ok: true, reason: null }
  } catch {
    return { ok: false, reason: 'quota' }
  }
}

/**
 * 读取任务集合（含归一化）
 * @param {Storage|null} storage
 * @returns {{tasks: import('@/types').Task[], status: 'ok'|'unavailable'|'corrupt'|'future', skipped: number}}
 */
export function loadTasks(storage) {
  const result = readEnvelope(storage, STORAGE_KEYS.TASKS)
  if (result.reason === 'unavailable') return { tasks: [], status: 'unavailable', skipped: 0 }
  if (result.reason === 'future') return { tasks: [], status: 'future', skipped: 0 }
  if (result.reason === 'corrupt') return { tasks: [], status: 'corrupt', skipped: 0 }

  const list = Array.isArray(result.data) ? result.data : []
  const tasks = list.map((item) => normalizeTask(item)).filter((task) => task !== null)
  return { tasks: tasks.sort((a, b) => a.order - b.order), status: 'ok', skipped: list.length - tasks.length }
}

/**
 * 读取偏好（含默认值补齐）
 * @param {Storage|null} storage
 * @returns {import('@/types').Prefs}
 */
export function loadPrefs(storage) {
  const result = readEnvelope(storage, STORAGE_KEYS.PREFS)
  const data = result.ok && result.data && typeof result.data === 'object' ? result.data : {}
  return {
    theme: data.theme === 'dark' ? 'dark' : DEFAULTS.theme,
    activeView: data.activeView === 'board' ? 'board' : DEFAULTS.activeView,
  }
}

/**
 * 保存任务集合
 * @param {Storage|null} storage
 * @param {import('@/types').Task[]} tasks
 */
export function saveTasks(storage, tasks) {
  return writeEnvelope(storage, STORAGE_KEYS.TASKS, tasks)
}

/**
 * 保存偏好
 * @param {Storage|null} storage
 * @param {import('@/types').Prefs} prefs
 */
export function savePrefs(storage, prefs) {
  return writeEnvelope(storage, STORAGE_KEYS.PREFS, prefs)
}
