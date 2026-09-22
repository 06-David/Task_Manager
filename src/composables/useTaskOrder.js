import { computed } from 'vue'
import { moveAvailability } from '@/models/orderOps'
import { STATUS_ORDER } from '@/constants'

/**
 * 顺序调整与看板分组的派生状态（R1：两视图共用同一份顺序）
 * @param {import('vue').Ref<import('@/types').Task[]>} visibleTasks 当前视图与筛选后的可见任务（已按 order 升序）
 * @param {import('vue').Ref<import('@/types').Task[]>} allTasks 全量任务
 */
export function useTaskOrder(visibleTasks, allTasks) {
  const visibleIds = computed(() => visibleTasks.value.map((task) => task.id))

  /**
   * @param {string} id
   */
  function availability(id) {
    return moveAvailability(visibleIds.value, id)
  }

  /** 看板三列分组，列顺序固定（FR-07 规则 1） */
  const columns = computed(() =>
    STATUS_ORDER.map((status) => ({
      status,
      tasks: visibleTasks.value.filter((task) => task.status === status),
      total: allTasks.value.filter((task) => task.status === status).length,
    })),
  )

  return { visibleIds, availability, columns }
}
