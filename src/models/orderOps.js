import { ORDER_FLOOR, ORDER_STEP } from '@/constants'

/**
 * 按可见序列交换 order（FR-13 规则 1/2）：纯函数，不修改入参
 * @param {import('@/types').Task[]} tasks 全量任务
 * @param {string} id 目标任务 id
 * @param {'up'|'down'} direction
 * @param {string[]} visibleIds 当前视图与筛选条件下的可见有序 id 序列
 * @returns {{tasks: import('@/types').Task[], changed: boolean}}
 */
export function swapOrder(tasks, id, direction, visibleIds) {
  const index = visibleIds.indexOf(id)
  if (index === -1) return { tasks, changed: false }

  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  if (neighborIndex < 0 || neighborIndex >= visibleIds.length) return { tasks, changed: false }

  const neighborId = visibleIds[neighborIndex]
  const current = tasks.find((task) => task.id === id)
  const neighbor = tasks.find((task) => task.id === neighborId)
  if (!current || !neighbor) return { tasks, changed: false }

  // 交换 order 值；updatedAt 不更新（顺序调整不是内容变更）
  const next = tasks.map((task) => {
    if (task.id === current.id) return { ...task, order: neighbor.order }
    if (task.id === neighbor.id) return { ...task, order: current.order }
    return task
  })

  return { tasks: sortByOrder(next), changed: true }
}

/**
 * 按 order 升序排序（返回新数组）
 * @param {import('@/types').Task[]} tasks
 * @returns {import('@/types').Task[]}
 */
export function sortByOrder(tasks) {
  return [...tasks].sort((a, b) => a.order - b.order)
}

/**
 * 判断某个 order 集合是否需要归一化重排（FR-13 规则 4）
 * @param {number[]} orders
 * @returns {boolean}
 */
export function needsRepack(orders) {
  if (orders.length < 2) return orders.some((order) => order < ORDER_FLOOR)
  const unique = new Set(orders)
  if (unique.size !== orders.length) return true
  return orders.some((order) => order < ORDER_FLOOR)
}

/**
 * 归一化重排某一状态的 order：保持相对顺序，按 ORDER_STEP 重新赋值（FR-13 规则 4）
 * @param {import('@/types').Task[]} tasks
 * @param {'todo'|'doing'|'done'} status
 * @returns {import('@/types').Task[]}
 */
export function repackColumn(tasks, status) {
  const columnTasks = sortByOrder(tasks.filter((task) => task.status === status))
  const orders = columnTasks.map((task) => task.order)
  if (!needsRepack(orders)) return tasks

  console.warn('[TaskManager] 检测到 order 下溢或重复，已归一化重排:', status)
  const reassigned = new Map(columnTasks.map((task, index) => [task.id, (index + 1) * ORDER_STEP]))
  return sortByOrder(tasks.map((task) => (reassigned.has(task.id) ? { ...task, order: reassigned.get(task.id) } : task)))
}

/**
 * 移动后执行下溢防护
 * @param {import('@/types').Task[]} tasks
 * @returns {import('@/types').Task[]}
 */
export function guardOrderBounds(tasks) {
  const statuses = [...new Set(tasks.map((task) => task.status))]
  return statuses.reduce((acc, status) => repackColumn(acc, status), tasks)
}

/**
 * 相邻可移动判定：可见序列中首位不可上移、末位不可下移（R3）
 * @param {string[]} visibleIds
 * @param {string} id
 * @returns {{canMoveUp: boolean, canMoveDown: boolean}}
 */
export function moveAvailability(visibleIds, id) {
  const index = visibleIds.indexOf(id)
  if (index === -1) return { canMoveUp: false, canMoveDown: false }
  return { canMoveUp: index > 0, canMoveDown: index < visibleIds.length - 1 }
}

/**
 * 移动任务并附带下溢防护
 * @param {import('@/types').Task[]} tasks
 * @param {string} id
 * @param {'up'|'down'} direction
 * @param {string[]} visibleIds
 * @returns {{tasks: import('@/types').Task[], changed: boolean}}
 */
export function moveTask(tasks, id, direction, visibleIds) {
  const result = swapOrder(tasks, id, direction, visibleIds)
  if (!result.changed) return result
  return { tasks: guardOrderBounds(result.tasks), changed: true }
}

/** 将同列任务插到目标卡片之前或之后，保持其他任务相对顺序。 */
export function insertTask(tasks, id, targetId, after = false) {
  const source = tasks.find(task => task.id === id)
  const target = tasks.find(task => task.id === targetId)
  if (!source || !target || id === targetId || source.status !== target.status) return { tasks, changed: false }
  const column = sortByOrder(tasks.filter(task => task.status === source.status))
  const next = column.filter(task => task.id !== id)
  next.splice(next.findIndex(task => task.id === targetId) + (after ? 1 : 0), 0, source)
  if (next.every((task, index) => task.id === column[index].id)) return { tasks, changed: false }
  const orders = new Map(next.map((task, index) => [task.id, (index + 1) * ORDER_STEP]))
  return { tasks: sortByOrder(tasks.map(task => orders.has(task.id) ? { ...task, order: orders.get(task.id) } : task)), changed: true }
}
