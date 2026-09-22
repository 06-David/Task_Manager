import { computed, readonly, ref } from 'vue'
import { PRIORITY_ORDER } from '@/constants'

/**
 * 搜索与筛选状态（MVP 原型仅提供状态/优先级筛选骨架，扩展口径见 EX-05）
 */
export function useFilters() {
  const keyword = ref('')
  const statuses = ref([])
  const priorities = ref([])

  function toggleStatus(value) {
    statuses.value = statuses.value.includes(value)
      ? statuses.value.filter((item) => item !== value)
      : [...statuses.value, value]
  }

  function togglePriority(value) {
    priorities.value = priorities.value.includes(value)
      ? priorities.value.filter((item) => item !== value)
      : [...priorities.value, value]
  }

  function clear() {
    keyword.value = ''
    statuses.value = []
    priorities.value = []
  }

  const isActive = computed(
    () => keyword.value.trim().length > 0 || statuses.value.length > 0 || priorities.value.length > 0,
  )

  /**
   * 应用筛选（同条件内部 OR，条件之间 AND）
   * @param {import('@/types').Task[]} tasks
   * @returns {import('@/types').Task[]}
   */
  function apply(tasks) {
    const term = keyword.value.trim().toLowerCase()
    return tasks.filter((task) => {
      if (statuses.value.length > 0 && !statuses.value.includes(task.status)) return false
      if (priorities.value.length > 0 && !priorities.value.includes(task.priority)) return false
      if (term.length > 0) {
        const haystack = `${task.title} ${task.description}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }

  return {
    keyword,
    statuses: readonly(statuses),
    priorities: readonly(priorities),
    priorityOptions: PRIORITY_ORDER,
    isActive,
    toggleStatus,
    togglePriority,
    clear,
    apply,
  }
}
