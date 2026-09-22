import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'

let wrapper
afterEach(() => {
  wrapper?.unmount()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('任务弹窗回归', () => {
  it('首次加载没有任何弹窗遮挡页面', () => {
    localStorage.clear()
    wrapper = mount(App)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('创建后可取消删除，再确认删除，弹窗正确关闭且数据持久化', async () => {
    localStorage.clear()
    wrapper = mount(App)
    const button = (text) => wrapper.findAll('button').find(item => item.text() === text)
    await button('新建任务').trigger('click')
    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)
    expect(wrapper.findAll('[role="dialog"] select')).toHaveLength(2)
    await wrapper.get('#task-title').setValue('删除回归测试')
    await button('创建').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('删除回归测试')
    await wrapper.get('button[aria-label="删除"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('删除回归测试')
    await button('取消').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('删除回归测试')
    await wrapper.get('button[aria-label="删除"]').trigger('click')
    await button('确认删除').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('删除回归测试')
    expect(JSON.parse(localStorage.getItem('task-manager:tasks:v1')).data).toEqual([])
  })
})
