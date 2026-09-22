import { LIMITS, PRIORITY, PRIORITY_ORDER, STATUS, STATUS_ORDER } from '@/constants'

/**
 * 标题校验：必填，trim 后 1–60 字符（FR-11）
 * @param {string} value
 * @returns {string|null} 错误文案，合法时为 null
 */
export function validateTitle(value) {
  const text = String(value ?? '').trim()
  if (text.length === 0) return '请输入任务标题'
  if (text.length > LIMITS.TITLE_MAX) {
    return `标题不能超过 ${LIMITS.TITLE_MAX} 个字符（当前 ${text.length} 个）`
  }
  return null
}

/**
 * 描述校验：选填，trim 后 ≤500 字符（FR-11）
 * @param {string} value
 * @returns {string|null}
 */
export function validateDescription(value) {
  const text = String(value ?? '').trim()
  if (text.length > LIMITS.DESC_MAX) {
    return `描述不能超过 ${LIMITS.DESC_MAX} 个字符（当前 ${text.length} 个）`
  }
  return null
}

/**
 * 优先级校验：取值限定三档（FR-11 / FR-06）
 * @param {string} value
 * @returns {string|null}
 */
export function validatePriority(value) {
  return PRIORITY_ORDER.includes(value) ? null : '请选择有效的优先级'
}

/**
 * 状态校验：取值限定三档（FR-11 / FR-05）
 * @param {string} value
 * @returns {string|null}
 */
export function validateStatus(value) {
  return STATUS_ORDER.includes(value) ? null : '请选择有效的状态'
}

/**
 * 表单全量校验，供新建与编辑复用（FR-11 规则 6）
 * @param {{title?: string, description?: string, priority?: string, status?: string}} form
 * @returns {{valid: boolean, errors: Record<string, string>, firstErrorField: string|null}}
 */
export function validateTaskForm(form = {}) {
  /** @type {Record<string, string>} */
  const errors = {}
  const titleError = validateTitle(form.title)
  if (titleError) errors.title = titleError

  const descError = validateDescription(form.description)
  if (descError) errors.description = descError

  const priorityError = validatePriority(form.priority ?? PRIORITY.MEDIUM)
  if (priorityError) errors.priority = priorityError

  const statusError = validateStatus(form.status ?? STATUS.TODO)
  if (statusError) errors.status = statusError

  const firstErrorField = ['title', 'description', 'priority', 'status'].find((field) => errors[field]) ?? null
  return { valid: Object.keys(errors).length === 0, errors, firstErrorField }
}
