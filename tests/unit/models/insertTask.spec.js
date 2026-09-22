import { describe, expect, it } from 'vitest'
import { insertTask, sortByOrder } from '@/models/orderOps'

const make = () => [
  { id: 'a', status: 'doing', order: 1, updatedAt: '原时间' },
  { id: 'b', status: 'doing', order: 2 },
  { id: 'c', status: 'doing', order: 3 },
  { id: 'd', status: 'todo', order: 4 },
]
const ids = tasks => sortByOrder(tasks.filter(t => t.status === 'doing')).map(t => t.id)
describe('栏内拖拽插入', () => {
  it('向下拖到末项后，保持其他任务相对顺序', () => {
    const input = make()
    const next = insertTask(input, 'a', 'c', true)
    expect(ids(next.tasks)).toEqual(['b', 'c', 'a'])
    expect(next.tasks.find(t => t.id === 'a').updatedAt).toBe('原时间')
    expect(ids(input)).toEqual(['a', 'b', 'c'])
    expect(next.tasks.find(t => t.id === 'd')).toBe(input[3])
  })
  it('向上拖到首项前', () => {
    expect(ids(insertTask(make(), 'c', 'a').tasks)).toEqual(['c', 'a', 'b'])
  })
  it('筛选未显示的中间项仍保留且不丢失', () => {
    expect(ids(insertTask(make(), 'c', 'a', true).tasks)).toEqual(['a', 'c', 'b'])
  })
  it('原位或自身不写入新顺序', () => {
    const tasks = make()
    expect(insertTask(tasks, 'a', 'a').tasks).toBe(tasks)
    expect(insertTask(tasks, 'a', 'b').changed).toBe(false)
  })
  it('未知任务和跨列请求不修改数据', () => {
    const tasks = make()
    expect(insertTask(tasks, 'unknown', 'a').changed).toBe(false)
    expect(insertTask(tasks, 'a', 'd').tasks).toBe(tasks)
  })
})
