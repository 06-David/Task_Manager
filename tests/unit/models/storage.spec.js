import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '@/constants'
import { loadPrefs, loadTasks, readEnvelope, savePrefs, saveTasks, writeEnvelope } from '@/models/storage'

/** 内存版 Storage 替身，模拟禁用（抛异常）场景 */
function createMemoryStorage({ failOnGet = false, failOnSet = false } = {}) {
  const map = new Map()
  return {
    map,
    getItem(key) {
      if (failOnGet) throw new Error('denied')
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      if (failOnSet) throw new Error('quota')
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

describe('writeEnvelope', () => {
  it('写入带 schemaVersion 的信封', () => {
    const storage = createMemoryStorage()
    const result = writeEnvelope(storage, 'k', { a: 1 })
    expect(result.ok).toBe(true)
    expect(JSON.parse(storage.map.get('k'))).toEqual({ schemaVersion: SCHEMA_VERSION, data: { a: 1 } })
  })

  it('storage 为 null 时返回 unavailable', () => {
    expect(writeEnvelope(null, 'k', {})).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('写入抛异常时返回 quota 而不抛出', () => {
    const storage = createMemoryStorage({ failOnSet: true })
    expect(writeEnvelope(storage, 'k', {})).toEqual({ ok: false, reason: 'quota' })
  })
})

describe('readEnvelope', () => {
  it('key 不存在时返回 ok 且 data 为 null', () => {
    expect(readEnvelope(createMemoryStorage(), 'missing')).toEqual({ ok: true, data: null, reason: null })
  })

  it('JSON 损坏时备份原始字符串并返回 corrupt', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', '{坏数据')
    const result = readEnvelope(storage, 'k')
    expect(result.reason).toBe('corrupt')
    expect([...storage.map.values()]).toContain('{坏数据')
  })

  it('缺少 schemaVersion 视为结构非法', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', JSON.stringify({ data: [] }))
    expect(readEnvelope(storage, 'k').reason).toBe('corrupt')
  })

  it('schemaVersion 高于当前支持版本时返回 future 并保留数据', () => {
    const storage = createMemoryStorage()
    storage.setItem('k', JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, data: [1] }))
    const result = readEnvelope(storage, 'k')
    expect(result.reason).toBe('future')
    expect(result.data).toEqual([1])
  })

  it('读取抛异常时返回 unavailable', () => {
    expect(readEnvelope(createMemoryStorage({ failOnGet: true }), 'k').reason).toBe('unavailable')
  })
})

describe('loadTasks', () => {
  it('读取并归一化任务，丢弃无效项', () => {
    const storage = createMemoryStorage()
    saveTasks(storage, [{ id: 'a', title: 'A', status: 'pending', order: 1000 }, { title: '无 id' }])
    const result = loadTasks(storage)
    expect(result.status).toBe('ok')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].status).toBe('todo')
    expect(result.skipped).toBe(1)
  })

  it('首次使用（无数据）返回空集合', () => {
    expect(loadTasks(createMemoryStorage())).toMatchObject({ tasks: [], status: 'ok' })
  })

  it('存储不可用时返回 unavailable 且不抛出', () => {
    expect(loadTasks(createMemoryStorage({ failOnGet: true })).status).toBe('unavailable')
  })

  it('本地存储为空时返回空集合并保持 ok', () => {
    const storage = createMemoryStorage()
    saveTasks(storage, [])
    expect(loadTasks(storage).tasks).toEqual([])
  })
})

describe('loadPrefs / savePrefs', () => {
  it('无偏好数据时返回默认值', () => {
    expect(loadPrefs(createMemoryStorage())).toEqual({ theme: 'light', activeView: 'list' })
  })

  it('保存后读取还原', () => {
    const storage = createMemoryStorage()
    savePrefs(storage, { theme: 'dark', activeView: 'board' })
    expect(loadPrefs(storage)).toEqual({ theme: 'dark', activeView: 'board' })
  })

  it('非法偏好值被归一化为默认值', () => {
    const storage = createMemoryStorage()
    writeEnvelope(storage, 'task-manager:prefs:v1', { theme: 'neon', activeView: 'grid' })
    expect(loadPrefs(storage)).toEqual({ theme: 'light', activeView: 'list' })
  })

  it('存储损坏时回退默认值而不抛出', () => {
    const storage = createMemoryStorage()
    storage.setItem('task-manager:prefs:v1', 'not-json')
    expect(loadPrefs(storage)).toEqual({ theme: 'light', activeView: 'list' })
  })
})
