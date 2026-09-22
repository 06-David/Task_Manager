import { computed } from 'vue'
import { STATUS, STATUS_ORDER } from '@/constants'

/**
 * 相对时间显示（FR-02 规则 3）
 * @param {string} iso
 * @param {number} [now]
 * @returns {string}
 */
export function formatRelativeTime(iso, now = Date.now()) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ''

  const diffMinutes = Math.floor((now - time) / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  return new Date(time).toISOString().slice(0, 10)
}

/**
 * 统计概览（EX-06 口径，原型内直接可见）
 * @param {import('vue').Ref<import('@/types').Task[]>} tasks
 */
export function useStats(tasks) {
  const stats = computed(() => {
    const total = tasks.value.length
    const counts = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = tasks.value.filter((task) => task.status === status).length
      return acc
    }, {})
    const done = counts[STATUS.DONE] ?? 0
    return {
      total,
      counts,
      completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
    }
  })

  return { stats }
}
