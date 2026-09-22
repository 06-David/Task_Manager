import { describe, expect, it, vi } from 'vitest'
import { ORDER_FLOOR, ORDER_STEP } from '@/constants'
import { guardOrderBounds, moveAvailability, moveTask, needsRepack, repackColumn, sortByOrder, swapOrder } from '@/models/orderOps'

function makeTasks(specs) {
  return specs.map(([id, status, order]) => ({
    id,
    title: id,
    description: '',
    status,
    priority: 'medium',
    order,
    dueDate: null,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
  }))
}

describe('swapOrder', () => {
  const tasks = makeTasks([
    ['a', 'todo', 1000],
    ['b', 'todo', 2000],
    ['c', 'todo', 3000],
  ])

  it('上移与相邻前一项交换 order 值', () => {
    const result = swapOrder(tasks, 'b', 'up', ['a', 'b', 'c'])
    expect(result.changed).toBe(true)
    expect(sortByOrder(result.tasks).map((task) => task.id)).toEqual(['b', 'a', 'c'])
  })

  it('下移与相邻后一项交换 order 值', () => {
    const result = swapOrder(tasks, 'b', 'down', ['a', 'b', 'c'])
    expect(sortByOrder(result.tasks).map((task) => task.id)).toEqual(['a', 'c', 'b'])
  })

  it('交换后不修改 updatedAt（顺序调整不是内容变更）', () => {
    const result = swapOrder(tasks, 'b', 'up', ['a', 'b', 'c'])
    const target = result.tasks.find((task) => task.id === 'b')
    expect(target.updatedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('不修改入参数组', () => {
    const snapshot = JSON.stringify(tasks)
    swapOrder(tasks, 'b', 'up', ['a', 'b', 'c'])
    expect(JSON.stringify(tasks)).toBe(snapshot)
  })

  it('首位上移无效且返回原数组引用', () => {
    const result = swapOrder(tasks, 'a', 'up', ['a', 'b', 'c'])
    expect(result.changed).toBe(false)
    expect(result.tasks).toBe(tasks)
  })

  it('末位下移无效', () => {
    expect(swapOrder(tasks, 'c', 'down', ['a', 'b', 'c']).changed).toBe(false)
  })

  it('单项序列两个方向均无效', () => {
    expect(swapOrder(tasks, 'a', 'up', ['a']).changed).toBe(false)
    expect(swapOrder(tasks, 'a', 'down', ['a']).changed).toBe(false)
  })

  it('目标项不在可见序列中视为无效', () => {
    expect(swapOrder(tasks, 'c', 'up', ['a', 'b']).changed).toBe(false)
  })

  it('相邻项在可见序列中但不在集合中时视为无效', () => {
    expect(swapOrder(tasks, 'b', 'up', ['ghost', 'b']).changed).toBe(false)
  })

  it('筛选序列下交换可见相邻项（全局可能不相邻）', () => {
    const spread = makeTasks([
      ['a', 'todo', 1000],
      ['b', 'doing', 2000],
      ['c', 'todo', 3000],
    ])
    const result = swapOrder(spread, 'c', 'up', ['a', 'c'])
    expect(sortByOrder(result.tasks).map((task) => task.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('moveAvailability', () => {
  it('首位仅可下移，末位仅可上移，中间项双向可移', () => {
    expect(moveAvailability(['a', 'b', 'c'], 'a')).toEqual({ canMoveUp: false, canMoveDown: true })
    expect(moveAvailability(['a', 'b', 'c'], 'b')).toEqual({ canMoveUp: true, canMoveDown: true })
    expect(moveAvailability(['a', 'b', 'c'], 'c')).toEqual({ canMoveUp: true, canMoveDown: false })
  })

  it('不在可见序列中的任务两个方向均不可移', () => {
    expect(moveAvailability(['a'], 'z')).toEqual({ canMoveUp: false, canMoveDown: false })
  })
})

describe('needsRepack / repackColumn / guardOrderBounds', () => {
  it('order 重复时判定需要重排', () => {
    expect(needsRepack([1000, 1000])).toBe(true)
    expect(needsRepack([1000, 2000])).toBe(false)
  })

  it('order 下溢时判定需要重排', () => {
    expect(needsRepack([ORDER_FLOOR - 1, 1000])).toBe(true)
    expect(needsRepack([ORDER_FLOOR, 1000])).toBe(false)
    expect(needsRepack([ORDER_FLOOR + 1, 1000])).toBe(false)
  })

  it('重排保持相对顺序并按步长赋值', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const column = makeTasks([
      ['b', 'todo', 1000],
      ['a', 'todo', 1000],
    ])
    const repacked = repackColumn(column, 'todo')
    expect(repacked.find((task) => task.id === 'b').order).toBe(1000)
    expect(repacked.find((task) => task.id === 'a').order).toBe(2000)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('无需重排时返回原数组引用', () => {
    const column = makeTasks([['a', 'todo', 1000]])
    expect(repackColumn(column, 'todo')).toBe(column)
    expect(guardOrderBounds(column)).toBe(column)
  })

  it('guardOrderBounds 仅整理出现重复 order 的列', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mixed = makeTasks([
      ['a', 'todo', 5],
      ['b', 'todo', 5],
      ['c', 'done', 9],
    ])
    const guarded = guardOrderBounds(mixed)
    expect(guarded.find((task) => task.id === 'c').order).toBe(9)
    expect(new Set(guarded.filter((task) => task.status === 'todo').map((task) => task.order)).size).toBe(2)
    warn.mockRestore()
  })
})

describe('moveTask', () => {
  it('移动成功后对目标列执行下溢防护', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tasks = makeTasks([
      ['a', 'todo', ORDER_FLOOR - 1],
      ['b', 'todo', 0],
    ])
    const result = moveTask(tasks, 'b', 'up', ['a', 'b'])
    expect(result.changed).toBe(true)
    expect(result.tasks.map((task) => task.id)).toEqual(['b', 'a'])
    expect(result.tasks.map((task) => task.order)).toEqual([ORDER_STEP, ORDER_STEP * 2])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('无效移动时返回原数组且不触发重排', () => {
    const tasks = makeTasks([
      ['a', 'todo', 1000],
      ['b', 'todo', 2000],
    ])
    const result = moveTask(tasks, 'a', 'up', ['a', 'b'])
    expect(result.changed).toBe(false)
    expect(result.tasks).toBe(tasks)
  })
})
