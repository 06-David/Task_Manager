
import { it as test } from 'vitest'
import assert from 'node:assert/strict'

const { createTask, applyTaskPatch, changeTaskStatus } = await import('@/models/taskFactory.js')
const { loadTasks, saveTasks, loadPrefs, savePrefs } = await import('@/models/storage.js')
const { validateTaskForm } = await import('@/models/validation.js')
const { STORAGE_KEYS, SCHEMA_VERSION } = await import('@/constants/index.js')

function storageDouble() {
  const data = new Map()
  return {
    data,
    failRead: false,
    failWrite: false,
    getItem(key) {
      if (this.failRead) throw new Error('读取被拒绝')
      return data.get(key) ?? null
    },
    setItem(key, value) {
      if (this.failWrite) throw new Error('配额不足')
      data.set(key, String(value))
    },
  }
}

test('T01 创建、编辑、完成、重新打开及删除后，存储往返保持一致', () => {
  const storage = storageDouble()
  const task = createTask({ title: ' 周报 ', description: ' 初稿 ' })
  assert.equal(saveTasks(storage, [task]).ok, true)
  let tasks = loadTasks(storage).tasks
  assert.equal(tasks[0].title, '周报')
  const edited = applyTaskPatch(tasks[0], { title: '周报终稿', priority: 'high' })
  tasks = changeTaskStatus([edited], edited.id, 'done').tasks
  saveTasks(storage, tasks)
  const restored = loadTasks(storage).tasks[0]
  assert.equal(restored.id, task.id)
  assert.equal(restored.createdAt, task.createdAt)
  assert.equal(restored.title, '周报终稿')
  assert.equal(restored.priority, 'high')
  assert.equal(restored.status, 'done')
  assert.ok(restored.completedAt)
  tasks = changeTaskStatus([restored], restored.id, 'doing').tasks
  assert.equal(tasks[0].completedAt, null)
  saveTasks(storage, tasks.filter(item => item.id !== restored.id))
  assert.deepEqual(loadTasks(storage).tasks, [])
})

test('T02 编辑切换状态时，目标列置顶顺序为零也必须生效', () => {
  const task = createTask({ title: '待办' })
  const edited = applyTaskPatch(task, { status: 'doing' }, { resetOrder: 0 })
  assert.equal(edited.order, 0)
  assert.equal(task.order, 1000)
})

test('T03 编辑不切换状态时，不应因传入零值而改变原顺序', () => {
  const task = createTask({ title: '待办' })
  assert.equal(applyTaskPatch(task, { title: '改名' }, { resetOrder: 0 }).order, task.order)
})

test('T04 写入失败不修改输入或破坏上次成功保存的数据', () => {
  const storage = storageDouble()
  const original = createTask({ title: '已保存' })
  saveTasks(storage, [original])
  const before = storage.data.get(STORAGE_KEYS.TASKS)
  const pending = [applyTaskPatch(original, { title: '本次修改' })]
  storage.failWrite = true
  assert.equal(saveTasks(storage, pending).ok, false)
  assert.equal(pending[0].title, '本次修改')
  assert.equal(storage.data.get(STORAGE_KEYS.TASKS), before)
})

test('T05 读取被拒绝时返回不可用状态，不抛出异常', () => {
  const storage = storageDouble()
  storage.failRead = true
  assert.deepEqual(loadTasks(storage), { tasks: [], status: 'unavailable', skipped: 0 })
})

test('T06 损坏 JSON 保存到明确的备份键，原始任务键保持不变', () => {
  const storage = storageDouble()
  const raw = '{损坏的任务'
  storage.setItem(STORAGE_KEYS.TASKS, raw)
  assert.equal(loadTasks(storage).status, 'corrupt')
  assert.equal(storage.data.get(STORAGE_KEYS.BACKUP), raw)
  assert.equal(storage.data.get(STORAGE_KEYS.TASKS), raw)
})

test('T07 损坏数据且备份写入失败时仍能返回容错结果', () => {
  const storage = storageDouble()
  storage.setItem(STORAGE_KEYS.TASKS, '{坏数据')
  storage.failWrite = true
  assert.equal(loadTasks(storage).status, 'corrupt')
})

test('T08 高版本数据读取时不改写原始任务或触发备份覆盖', () => {
  const storage = storageDouble()
  const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, data: [{ id: 'future' }] })
  storage.setItem(STORAGE_KEYS.TASKS, raw)
  assert.equal(loadTasks(storage).status, 'future')
  assert.equal(storage.data.get(STORAGE_KEYS.TASKS), raw)
  assert.equal(storage.data.has(STORAGE_KEYS.BACKUP), false)
})

test('T09 一条损坏记录不会丢弃同批次的有效任务', () => {
  const storage = storageDouble()
  const valid = createTask({ title: '保留任务' })
  saveTasks(storage, [null, valid, { title: '缺少标识' }])
  const result = loadTasks(storage)
  assert.equal(result.skipped, 2)
  assert.deepEqual(result.tasks, [valid])
})

test('T10 保存主题偏好不会覆盖任务集合', () => {
  const storage = storageDouble()
  const task = createTask({ title: '不能丢失' })
  saveTasks(storage, [task])
  const raw = storage.data.get(STORAGE_KEYS.TASKS)
  savePrefs(storage, { theme: 'dark', activeView: 'board' })
  assert.deepEqual(loadPrefs(storage), { theme: 'dark', activeView: 'board' })
  assert.equal(storage.data.get(STORAGE_KEYS.TASKS), raw)
})

for (const from of ['todo', 'doing', 'done']) {
  for (const to of ['todo', 'doing', 'done']) {
    test(`T11 状态组合 ${from} → ${to}：标识与原输入保持不变`, () => {
      const task = createTask({ title: '状态矩阵', status: from })
      const input = [task]
      const snapshot = JSON.stringify(input)
      const result = changeTaskStatus(input, task.id, to)
      assert.equal(result.changed, from !== to)
      assert.equal(result.tasks.length, 1)
      assert.equal(result.tasks[0].id, task.id)
      assert.equal(result.tasks[0].status, to)
      assert.equal(JSON.stringify(input), snapshot)
      if (from === to) assert.equal(result.tasks, input)
      if (to === 'done') assert.ok(result.tasks[0].completedAt)
      else assert.equal(result.tasks[0].completedAt, null)
    })
  }
}

test('T12 描述长度边界为去除首尾空白后 500，501 不通过', () => {
  assert.equal(validateTaskForm({ title: '边界', description: ` ${'字'.repeat(500)} ` }).valid, true)
  const result = validateTaskForm({ title: '边界', description: '字'.repeat(501) })
  assert.equal(result.valid, false)
  assert.equal(result.firstErrorField, 'description')
})

test('T13 标记文本经过任务构造与存储后保持原文，不属于领域层 HTML 处理', () => {
  const storage = storageDouble()
  const text = '<img src=x onerror=alert(1)> & "引号"'
  const task = createTask({ title: text, description: text })
  saveTasks(storage, [task])
  assert.equal(loadTasks(storage).tasks[0].title, text)
  assert.equal(loadTasks(storage).tasks[0].description, text)
})

