import { describe, expect, it } from 'vitest'
import { validateDescription, validateTaskForm, validateTitle } from '@/models/validation'

describe('validateTitle', () => {
  it('合法标题返回 null', () => {
    expect(validateTitle('写周报')).toBeNull()
  })

  it('空标题与纯空格标题返回必填错误', () => {
    expect(validateTitle('')).toBe('请输入任务标题')
    expect(validateTitle('   ')).toBe('请输入任务标题')
  })

  it('超过 60 字符返回超长错误并带当前长度', () => {
    const value = 'a'.repeat(61)
    expect(validateTitle(value)).toBe('标题不能超过 60 个字符（当前 61 个）')
  })

  it('恰好 60 字符（含首尾空格 trim 后）视为合法', () => {
    expect(validateTitle(`  ${'a'.repeat(60)}  `)).toBeNull()
  })
})

describe('validateDescription', () => {
  it('空描述合法', () => {
    expect(validateDescription('')).toBeNull()
  })

  it('超过 500 字符返回超长错误', () => {
    expect(validateDescription('b'.repeat(501))).toBe('描述不能超过 500 个字符（当前 501 个）')
  })
})

describe('validateTaskForm', () => {
  it('全部合法时 valid 为 true 且无首个错误字段', () => {
    const result = validateTaskForm({ title: '任务', description: '', priority: 'high', status: 'doing' })
    expect(result.valid).toBe(true)
    expect(result.firstErrorField).toBeNull()
  })

  it('多字段失败时返回按字段顺序的首个错误字段', () => {
    const result = validateTaskForm({ title: '', description: 'c'.repeat(501), priority: 'medium', status: 'todo' })
    expect(result.valid).toBe(false)
    expect(result.firstErrorField).toBe('title')
    expect(Object.keys(result.errors)).toEqual(['title', 'description'])
  })

  it('非法优先级与状态被识别', () => {
    const result = validateTaskForm({ title: '任务', priority: 'urgent', status: 'pending' })
    expect(result.errors.priority).toBe('请选择有效的优先级')
    expect(result.errors.status).toBe('请选择有效的状态')
  })

  it('缺省优先级与状态时按默认值校验通过', () => {
    expect(validateTaskForm({ title: '任务' }).valid).toBe(true)
  })
})
