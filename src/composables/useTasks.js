import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants'
import { loadTasks, saveTasks } from '@/models/storage'
import { applyTaskPatch, changeTaskStatus, createTask, topOrderFor } from '@/models/taskFactory'
import { insertTask, moveTask, sortByOrder } from '@/models/orderOps'
import { resolveStorage } from './usePrefs'

/**
 * 任务集合：唯一数据源，全部写操作同步立即持久化（FR-10 规则 3）
 */
export function useTasks() {
  const storage = resolveStorage()
  const initial = loadTasks(storage)
  const tasks = ref(initial.tasks)
  const storageAvailable = ref(storage !== null)
  const loadStatus = ref(initial.status)
  const droppedCount = ref(initial.skipped)

  function persist() {
    const result = saveTasks(storage, tasks.value)
    if (!result.ok) storageAvailable.value = false
    return result.ok
  }

  function commit(nextTasks) {
    tasks.value = sortByOrder(nextTasks)
    persist()
  }

  /**
   * 新建任务（FR-01）
   * @param {{title: string, description?: string, priority?: string, status?: string}} form
   * @returns {import('@/types').Task}
   */
  function addTask(form) {
    const task = createTask(form, tasks.value)
    commit([...tasks.value, task])
    return task
  }

  /**
   * 编辑任务（FR-03）
   * @param {string} id
   * @param {object} patch
   * @returns {boolean} 目标任务是否仍存在
   */
  function updateTask(id, patch) {
    const target = tasks.value.find((task) => task.id === id)
    if (!target) return false
    const others = tasks.value.filter((task) => task.id !== id)
    const nextStatus = patch.status ?? target.status
    const resetOrder = nextStatus !== target.status ? topOrderFor(others, nextStatus) : undefined
    const updated = applyTaskPatch(target, patch, { resetOrder })
    commit([...others, updated])
    return true
  }

  /**
   * 删除任务（FR-04）：不重排其余 order，允许数值空洞
   * @param {string} id
   */
  function removeTask(id) {
    commit(tasks.value.filter((task) => task.id !== id))
  }

  /**
   * 状态流转（FR-05）：EX-01 拖拽将复用同一领域函数
   * @param {string} id
   * @param {'todo'|'doing'|'done'} status
   */
  function setStatus(id, status) {
    const result = changeTaskStatus(tasks.value, id, status)
    if (!result.changed) return
    commit(result.tasks)
  }

  /**
   * 上移 / 下移（FR-13）
   * @param {string} id
   * @param {'up'|'down'} direction
   * @param {string[]} visibleIds
   */
  function move(id, direction, visibleIds) {
    const result = moveTask(tasks.value, id, direction, visibleIds)
    if (!result.changed) return
    commit(result.tasks)
  }

  /**
   * 其他标签页修改后重新载入（FR-10 规则 5）
   */
  function reorder(id, targetId, after) {
    const result = insertTask(tasks.value, id, targetId, after)
    if (result.changed) commit(result.tasks)
  }

  function reload() {
    const next = loadTasks(storage)
    tasks.value = next.tasks
    loadStatus.value = next.status
  }

  const byOrder = computed(() => sortByOrder(tasks.value))

  return {
    tasks,
    byOrder,
    storageAvailable,
    loadStatus,
    droppedCount,
    addTask,
    updateTask,
    removeTask,
    setStatus,
    move,
    reorder,
    reload,
    commit,
    storageKey: STORAGE_KEYS.TASKS,
  }
}
