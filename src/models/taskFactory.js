import { DEFAULTS, ORDER_STEP, PRIORITY, PRIORITY_ORDER, STATUS, STATUS_ORDER } from '@/constants'

/**
 * 生成任务 id：优先 crypto.randomUUID，失败回退可读格式（FR-01 规则 3）
 * @returns {string}
 */
export function createId() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    try {
      return cryptoObj.randomUUID()
    } catch {
      /* 回退到下方实现 */
    }
  }
  const rand = Math.random().toString(36).slice(2, 8)
  return `t-${Date.now()}-${rand}`
}

/**
 * 归一化优先级：非法值回退 medium 并告警（FR-06 规则 5）
 * @param {unknown} value
 * @returns {'high'|'medium'|'low'}
 */
export function normalizePriority(value) {
  if (PRIORITY_ORDER.includes(/** @type {string} */ (value))) return /** @type {any} */ (value)
  if (value !== undefined) console.warn('[TaskManager] 非法优先级已归一化为 medium:', value)
  return PRIORITY.MEDIUM
}

/**
 * 归一化状态：非法值回退 todo 并告警（FR-05 规则 6）
 * @param {unknown} value
 * @returns {'todo'|'doing'|'done'}
 */
export function normalizeStatus(value) {
  if (STATUS_ORDER.includes(/** @type {string} */ (value))) return /** @type {any} */ (value)
  if (value !== undefined) console.warn('[TaskManager] 非法状态已归一化为 todo:', value)
  return STATUS.TODO
}

/**
 * 归一化任意来源的任务对象（FR-10 规则 4 / 必测清单 8）
 * @param {any} raw
 * @returns {import('@/types').Task|null} 结构不可用时返回 null
 */
export function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null

  const now = new Date().toISOString()
  const status = normalizeStatus(raw.status)
  const order = Number.isFinite(Number(raw.order)) ? Number(raw.order) : Date.parse(raw.createdAt) || 0

  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    status,
    priority: normalizePriority(raw.priority),
    order,
    dueDate: typeof raw.dueDate === 'string' && raw.dueDate ? raw.dueDate : null,
    tagIds: Array.isArray(raw.tagIds) ? raw.tagIds.filter((id) => typeof id === 'string') : [],
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      status === STATUS.DONE ? (typeof raw.completedAt === 'string' ? raw.completedAt : now) : null,
  }
}

/**
 * 归一化任务集合：丢弃不可用项，按 order 升序返回
 * @param {unknown} rawList
 * @returns {import('@/types').Task[]}
 */
export function normalizeTasks(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList
    .map((item) => normalizeTask(item))
    .filter((task) => task !== null)
    .sort((a, b) => a.order - b.order)
}

/**
 * 计算目标状态列的置顶 order（R2：目标列最小 order − 步长）
 * @param {import('@/types').Task[]} tasks
 * @param {'todo'|'doing'|'done'} status
 * @returns {number}
 */
export function topOrderFor(tasks, status) {
  const columnOrders = tasks.filter((task) => task.status === status).map((task) => task.order)
  if (columnOrders.length === 0) return ORDER_STEP
  return Math.min(...columnOrders) - ORDER_STEP
}

/**
 * 创建任务对象（FR-01）
 * @param {{title: string, description?: string, priority?: string, status?: string}} input
 * @param {import('@/types').Task[]} [existing]
 * @returns {import('@/types').Task}
 */
export function createTask(input, existing = []) {
  const now = new Date().toISOString()
  const status = normalizeStatus(input.status ?? DEFAULTS.status)
  return {
    id: createId(),
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    status,
    priority: normalizePriority(input.priority ?? DEFAULTS.priority),
    order: topOrderFor(existing, status),
    dueDate: null,
    tagIds: [],
    createdAt: now,
    updatedAt: now,
    completedAt: status === STATUS.DONE ? now : null,
  }
}

/**
 * 应用字段修改（FR-03）：id/createdAt 永不变更，completedAt 随状态流转
 * @param {import('@/types').Task} task
 * @param {{title?: string, description?: string, priority?: string, status?: string}} patch
 * @param {{resetOrder?: number}} [options]
 * @returns {import('@/types').Task} 新对象
 */
export function applyTaskPatch(task, patch, options = {}) {
  const nextStatus = patch.status === undefined ? task.status : normalizeStatus(patch.status)
  const now = new Date().toISOString()
  const statusChanged = nextStatus !== task.status
  return {
    ...task,
    title: patch.title === undefined ? task.title : String(patch.title).trim(),
    description: patch.description === undefined ? task.description : String(patch.description).trim(),
    priority: patch.priority === undefined ? task.priority : normalizePriority(patch.priority),
    status: nextStatus,
    order: Number.isFinite(options.resetOrder) && statusChanged ? options.resetOrder : task.order,
    updatedAt: now,
    completedAt: statusChanged ? (nextStatus === STATUS.DONE ? now : null) : task.completedAt,
  }
}

/**
 * 状态流转领域函数（FR-05）：EX-01 拖拽必须复用本函数
 * @param {import('@/types').Task[]} tasks
 * @param {string} id
 * @param {'todo'|'doing'|'done'} nextStatus
 * @returns {{tasks: import('@/types').Task[], changed: boolean}}
 */
export function changeTaskStatus(tasks, id, nextStatus) {
  const target = tasks.find((task) => task.id === id)
  const status = normalizeStatus(nextStatus)
  if (!target || target.status === status) return { tasks, changed: false }

  const now = new Date().toISOString()
  const others = tasks.filter((task) => task.id !== id)
  const updated = {
    ...target,
    status,
    order: topOrderFor(others, status),
    updatedAt: now,
    completedAt: status === STATUS.DONE ? now : null,
  }
  return {
    tasks: [...others, updated].sort((a, b) => a.order - b.order),
    changed: true,
  }
}

