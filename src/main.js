import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

const app = createApp(App)

/** FR-12-g：捕获渲染期未处理异常，交由界面展示提示而非白屏 */
app.config.errorHandler = (error, instance, info) => {
  console.error('[TaskManager] 未捕获异常:', error, info)
  window.dispatchEvent(new window.ErrorEvent('error', { error, message: String(error?.message ?? error) }))
}

app.mount('#app')
