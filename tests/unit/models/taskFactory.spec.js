import { describe, expect, it, vi } from 'vitest'
import {
  applyTaskPatch,
  changeTaskStatus,
  createId,
  createTask,
  normalizePriority,
  normalizeStatus,
  normalizeTask,
  normalizeTasks,
  topOrderFor,
} from '@/models/taskFactory'

describe('createId', () => {
  it('优先使用 crypto.randomUUID', () => {
    const id = createId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(8)
  })

  it('crypto 不可用时回退为 t-<时间戳>-<6位随机> 格式', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', {})
    const id = createId()
    expect(id).toMatch(/^t-\d+-[a-z0-9]{1,8}$/)
    vi.stubGlobal('crypto', original)
  })

  it('两次调用生成不同 id', () => {
    expect(createId()).not.toBe(createId())
  })
})

describe('normalizePriority / normalizeStatus', () => {
  it('非法值回退并告警，合法值原样返回', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizePriority('urgent')).toBe('medium')
    expect(normalizeStatus('pending')).toBe('todo')
    expect(normalizePriority('high')).toBe('high')
    expect(normalizeStatus('done')).toBe('done')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('normalizeTask', () => {
  it('补齐缺失字段并归一化非法值', () => {
    const task = normalizeTask({ id: 'a1', title: '任务', status: 'pending', priority: 'x' })
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('medium')
    expect(task.dueDate).toBeNull()
    expect(task.tagIds).toEqual([])
    expect(task.completedAt).toBeNull()
    expect(typeof task.createdAt).toBe('string')
  })

  it('done 任务缺少 completedAt 时补齐', () => {
    const task = normalizeTask({ id: 'a2', title: '完成项', status: 'done' })
    expect(typeof task.completedAt).toBe('string')
  })

  it('done 之外的既有任务清除 completedAt', () => {
    const task = normalizeTask({ id: 'a3', title: '进行中', status: 'doing', completedAt: '2026-01-01T00:00:00.000Z' })
    expect(task.completedAt).toBeNull()
  })

  it('结构不可用时返回 null', () => {
    expect(normalizeTask(null)).toBeNull()
    expect(normalizeTask({ title: '无 id' })).toBeNull()
    expect(normalizeTask('字符串')).toBeNull()
  })
})

describe('normalizeTasks', () => {
  it('过滤无效项并按 order 升序排列', () => {
    const tasks = normalizeTasks([
      { id: 'b', order: 2000, title: 'B' },
      { title: '无效' },
      { id: 'a', order: 1000, title: 'A' },
    ])
    expect(tasks.map((task) => task.id)).toEqual(['a', 'b'])
  })

  it('非数组输入返回空数组', () => {
    expect(normalizeTasks(null)).toEqual([])
    expect(normalizeTasks({})).toEqual([])
  })
})

describe('topOrderFor', () => {
  it('空列返回 ORDER_STEP', () => {
    expect(topOrderFor([], 'todo')).toBe(1000)
  })

  it('返回目标列最小 order 减步长', () => {
    const tasks = [
      { id: 'a', status: 'todo', order: 3000 },
      { id: 'b', status: 'doing', order: 100 },
    ]
    expect(topOrderFor(tasks, 'todo')).toBe(2000)
  })
})

describe('createTask', () => {
  it('填充默认值并置于目标列顶部', () => {
    const existing = [{ id: 'a', status: 'todo', order: 5000, title: '既有', priority: 'low', description: '' }]
    const task = createTask({ title: '  新任务  ', description: '  说明  ' }, existing)
    expect(task.title).toBe('新任务')
    expect(task.description).toBe('说明')
    expect(task.priority).toBe('medium')
    expect(task.status).toBe('todo')
    expect(task.order).toBe(4000)
    expect(task.dueDate).toBeNull()
    expect(task.tagIds).toEqual([])
    expect(task.completedAt).toBeNull()
    expect(task.createdAt).toBe(task.updatedAt)
  })

  it('初始状态为 done 时写入 completedAt', () => {
    const task = createTask({ title: '直接完成', status: 'done' }, [])
    expect(task.completedAt).not.toBeNull()
  })
})

describe('applyTaskPatch', () => {
  const base = {
    id: 'x',
    title: '原标题',
    description: '原描述',
    status: 'todo',
    priority: 'low',
    order: 1000,
    dueDate: null,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
  }

  it('更新字段并刷新 updatedAt，保持 id 与 createdAt 不变', () => {
    const next = applyTaskPatch(base, { title: ' 新标题 ', description: '新描述', priority: 'high' })
    expect(next.title).toBe('新标题')
    expect(next.priority).toBe('high')
    expect(next.id).toBe('x')
    expect(next.createdAt).toBe(base.createdAt)
    expect(next.updatedAt).not.toBe(base.updatedAt)
  })

  it('未变更字段保持原值，输入对象不被修改', () => {
    const next = applyTaskPatch(base, { title: '改名' })
    expect(next.description).toBe('原描述')
    expect(next.status).toBe('todo')
    expect(base.title).toBe('原标题')
  })

  it('状态改为 done 时写入 completedAt，改回时清除', () => {
    const done = applyTaskPatch(base, { status: 'done' })
    expect(done.completedAt).not.toBeNull()
    const back = applyTaskPatch(done, { status: 'doing' })
    expect(back.completedAt).toBeNull()
  })

  it('状态变化时按 resetOrder 落位，未变化时保持 order', () => {
    const moved = applyTaskPatch(base, { status: 'doing' }, { resetOrder: 500 })
    expect(moved.order).toBe(500)
    const kept = applyTaskPatch(base, { title: '改' }, { resetOrder: 500 })
    expect(kept.order).toBe(1000)
  })
})

describe('changeTaskStatus', () => {
  const tasks = [
    { id: 'a', title: 'A', status: 'todo', order: 1000, updatedAt: '2026-01-01T00:00:00.000Z', completedAt: null },
    { id: 'b', title: 'B', status: 'doing', order: 2000, updatedAt: '2026-01-01T00:00:00.000Z', completedAt: null },
  ]

  it('状态变更后置于目标列顶部并更新 updatedAt', () => {
    const result = changeTaskStatus(tasks, 'a', 'doing')
    const moved = result.tasks.find((task) => task.id === 'a')
    expect(result.changed).toBe(true)
    expect(moved.status).toBe('doing')
    expect(moved.order).toBe(1000)
    expect(moved.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')
  })

  it('进入 done 写入 completedAt，离开 done 清除', () => {
    const done = changeTaskStatus(tasks, 'a', 'done').tasks.find((task) => task.id === 'a')
    expect(done.completedAt).not.toBeNull()
    const back = changeTaskStatus([done], 'a', 'todo').tasks.find((task) => task.id === 'a')
    expect(back.completedAt).toBeNull()
  })

  it('选择当前状态视为无操作', () => {
    const result = changeTaskStatus(tasks, 'a', 'todo')
    expect(result.changed).toBe(false)
    expect(result.tasks).toBe(tasks)
  })

  it('目标任务不存在时视为无操作', () => {
    expect(changeTaskStatus(tasks, 'missing', 'done').changed).toBe(false)
  })
})
