/** 存储 key 与 schema 版本（FR-10 规则 2 / NFR-08） */
export const SCHEMA_VERSION = 1

export const STORAGE_KEYS = {
  TASKS: `task-manager:tasks:v${SCHEMA_VERSION}`,
  TAGS: `task-manager:tags:v${SCHEMA_VERSION}`,
  PREFS: `task-manager:prefs:v${SCHEMA_VERSION}`,
  BACKUP: `task-manager:backup:v${SCHEMA_VERSION}`,
}

export const STATUS = { TODO: 'todo', DOING: 'doing', DONE: 'done' }

export const STATUS_ORDER = [STATUS.TODO, STATUS.DOING, STATUS.DONE]

export const STATUS_LABELS = { todo: '待办', doing: '进行中', done: '完成' }

export const PRIORITY = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }

export const PRIORITY_ORDER = [PRIORITY.HIGH, PRIORITY.MEDIUM, PRIORITY.LOW]

export const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' }

/** 顺序步长（FR-13 规则 3） */
export const ORDER_STEP = 1000

/** 顺序下溢防护阈值（FR-13 规则 4） */
export const ORDER_FLOOR = Number.MIN_SAFE_INTEGER / 2

export const LIMITS = { TITLE_MAX: 60, DESC_MAX: 500 }

export const DEFAULTS = {
  priority: PRIORITY.MEDIUM,
  status: STATUS.TODO,
  theme: 'light',
  activeView: 'list',
}

export const VIEWS = { LIST: 'list', BOARD: 'board' }

export const VIEW_LABELS = { list: '列表', board: '看板' }
