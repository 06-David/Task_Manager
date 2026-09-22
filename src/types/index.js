/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'todo'|'doing'|'done'} status
 * @property {'high'|'medium'|'low'} priority
 * @property {number} order
 * @property {string|null} dueDate   扩展预留（EX-03）
 * @property {string[]} tagIds       扩展预留（EX-04）
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} Prefs
 * @property {'light'|'dark'} theme
 * @property {'list'|'board'} activeView
 */

export {}
