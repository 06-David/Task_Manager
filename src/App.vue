<script setup>
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER, VIEWS, VIEW_LABELS } from '@/constants'
import { usePrefs } from '@/composables/usePrefs'
import { useTheme } from '@/composables/useTheme'
import { useTasks } from '@/composables/useTasks'
import { useTaskOrder } from '@/composables/useTaskOrder'
import { useFilters } from '@/composables/useFilters'
import { useStats } from '@/composables/useStats'
import Banner from '@/components/common/Banner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDeleteDialog from '@/components/task/TaskDeleteDialog.vue'
import TaskListItem from '@/components/task/TaskListItem.vue'
import BoardView from '@/components/board/BoardView.vue'

const prefsApi = usePrefs()
const theme = useTheme(prefsApi)
const taskApi = useTasks()
const filters = useFilters()
const { stats } = useStats(taskApi.byOrder)

const formOpen = ref(false)
const editingTask = ref(null)
const presetStatus = ref('')
const deleteTarget = ref(null)
const storageNoticeVisible = ref(true)
const runtimeError = ref('')
const newTaskButton = ref(null)

const filteredTasks = computed(() => filters.apply(taskApi.byOrder.value))
const { availability, columns } = useTaskOrder(filteredTasks, taskApi.byOrder)

const activeView = computed(() => prefsApi.prefs.value.activeView)
const isBoard = computed(() => activeView.value === VIEWS.BOARD)
const showEmptyState = computed(() => taskApi.byOrder.value.length === 0)
const showNoMatchState = computed(() => !showEmptyState.value && filteredTasks.value.length === 0 && filters.isActive.value)

const storageWarning = computed(() => {
  if (!taskApi.storageAvailable.value || !prefsApi.storageAvailable.value) {
    return '当前浏览器无法保存数据，刷新后内容将丢失'
  }
  if (taskApi.loadStatus.value === 'corrupt') return '检测到本地数据异常，已重置并备份原数据'
  if (taskApi.loadStatus.value === 'future') return '数据由更新版本创建，请升级应用以避免数据损坏'
  return ''
})

const storageReadOnly = computed(() => taskApi.loadStatus.value === 'future')

const viewTabs = [VIEWS.LIST, VIEWS.BOARD]

function openCreateForm(status = '') {
  editingTask.value = null
  presetStatus.value = status
  formOpen.value = true
}

function openEditForm(task) {
  editingTask.value = { ...task }
  presetStatus.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingTask.value = null
}

/**
 * @param {{title: string, description: string, priority: string, status: string}} payload
 */
function submitForm(payload) {
  if (storageReadOnly.value) return
  if (editingTask.value) {
    taskApi.updateTask(editingTask.value.id, payload)
  } else {
    taskApi.addTask(payload)
  }
  closeForm()
  newTaskButton.value?.focus()
}

function requestDelete(task) {
  deleteTarget.value = { ...task }
}

function confirmDelete() {
  if (storageReadOnly.value) return
  if (deleteTarget.value) taskApi.removeTask(deleteTarget.value.id)
  deleteTarget.value = null
}

function onStatusChange(id, status) {
  if (storageReadOnly.value) return
  taskApi.setStatus(id, status)
}

function onMove(id, direction) {
  if (storageReadOnly.value) return
  taskApi.move(id, direction, filteredTasks.value.map((task) => task.id))
}

function onReorder(id, targetId, after) {
  if (!storageReadOnly.value) taskApi.reorder(id, targetId, after)
}

function setView(view) {
  prefsApi.setActiveView(view)
}

function onStorageEvent(event) {
  if (event.key === taskApi.storageKey) taskApi.reload()
  if (event.key === null) taskApi.reload()
  prefsApi.refresh()
  theme.apply(prefsApi.prefs.value.theme)
}

/** FR-12-g：渲染期异常兜底，禁止白屏 */
function onError(event) {
  runtimeError.value = event?.error?.message ?? String(event?.message ?? '发生未知错误')
  console.error('[TaskManager] 渲染期异常:', event?.error ?? event)
}

onMounted(() => {
  window.addEventListener('storage', onStorageEvent)
  window.addEventListener('error', onError)
})

onScopeDispose(() => {
  window.removeEventListener('storage', onStorageEvent)
  window.removeEventListener('error', onError)
})
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 lg:p-6">
    <div v-if="storageWarning && storageNoticeVisible" class="flex flex-col gap-2">
      <Banner
        :tone="taskApi.loadStatus.value === 'future' ? 'error' : 'info'"
        :message="storageWarning"
        @dismiss="storageNoticeVisible = false"
      />
    </div>

    <Banner v-if="runtimeError" tone="error" :message="`页面渲染出现异常：${runtimeError}`" @dismiss="runtimeError = ''" />

    <header class="flex flex-col gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-[var(--color-ink)]">任务管理</h1>
          <p class="text-xs text-[var(--color-ink-muted)]">
            共 {{ stats.total }} 条 · 待办 {{ stats.counts.todo }} · 进行中 {{ stats.counts.doing }} · 完成
            {{ stats.counts.done }} · 完成率 {{ stats.completionRate }}%
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex rounded-lg border border-[var(--color-line)] p-0.5" role="tablist" aria-label="视图切换">
            <button
              v-for="view in viewTabs"
              :key="view"
              type="button"
              role="tab"
              :aria-selected="activeView === view"
              class="rounded-md px-3 py-1.5 text-sm"
              :class="
                activeView === view
                  ? 'bg-[var(--color-accent)] font-medium text-[var(--color-accent-ink)]'
                  : 'text-[var(--color-ink-muted)]'
              "
              @click="setView(view)"
            >
              {{ VIEW_LABELS[view] }}
            </button>
          </div>

          <button
            type="button"
            class="rounded-md border border-[var(--color-line)] p-2 text-[var(--color-ink)]"
            :aria-label="theme.isDark.value ? '切换到浅色模式' : '切换到深色模式'"
            :title="theme.isDark.value ? '切换到浅色模式' : '切换到深色模式'"
            @click="theme.toggle()"
          >
            <svg v-if="theme.isDark.value" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke="currentColor" stroke-width="2" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z" />
            </svg>
          </button>

          <button
            ref="newTaskButton"
            type="button"
            class="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-ink)]"
            @click="openCreateForm()"
          >
            新建任务
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-xs">
        <input
          v-model="filters.keyword.value"
          type="search"
          placeholder="搜索标题或描述"
          class="w-48 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[var(--color-ink)]"
          aria-label="搜索任务"
        />
        <div class="flex items-center gap-1">
          <span class="text-[var(--color-ink-muted)]">状态</span>
          <button
            v-for="status in STATUS_ORDER"
            :key="status"
            type="button"
            class="rounded-full border px-2 py-0.5"
            :class="
              filters.statuses.value.includes(status)
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-ink-muted)]'
            "
            :aria-pressed="filters.statuses.value.includes(status)"
            @click="filters.toggleStatus(status)"
          >
            {{ STATUS_LABELS[status] }}
          </button>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[var(--color-ink-muted)]">优先级</span>
          <button
            v-for="priority in filters.priorityOptions"
            :key="priority"
            type="button"
            class="rounded-full border px-2 py-0.5"
            :class="
              filters.priorities.value.includes(priority)
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-ink-muted)]'
            "
            :aria-pressed="filters.priorities.value.includes(priority)"
            @click="filters.togglePriority(priority)"
          >
            {{ PRIORITY_LABELS[priority] }}
          </button>
        </div>
        <button
          v-if="filters.isActive.value"
          type="button"
          class="rounded-md border border-[var(--color-line)] px-2 py-1 text-[var(--color-ink)]"
          @click="filters.clear()"
        >
          清除筛选
        </button>
        <span v-if="filters.isActive.value" class="text-[var(--color-ink-muted)]">
          匹配 {{ filteredTasks.length }} 条
        </span>
      </div>
    </header>

    <main class="flex flex-1 flex-col gap-3">
      <EmptyState
        v-if="showEmptyState"
        title="还没有任何任务"
        description="点击「新建任务」创建第一条待办，数据会保存在本机浏览器中。"
        action-label="新建任务"
        @action="openCreateForm()"
      />

      <template v-else>
        <EmptyState
          v-if="showNoMatchState"
          title="没有匹配的任务"
          description="当前筛选条件下没有结果。"
          action-label="清除筛选"
          @action="filters.clear()"
        />

        <template v-else>
          <section
            v-if="!isBoard"
            class="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]"
            aria-label="任务列表"
          >
            <TaskListItem
              v-for="task in filteredTasks"
              :key="task.id"
              :task="task"
              :can-move-up="availability(task.id).canMoveUp"
              :can-move-down="availability(task.id).canMoveDown"
              @edit="openEditForm(task)"
              @delete="requestDelete(task)"
              @status="(status) => onStatusChange(task.id, status)"
              @move="(direction) => onMove(task.id, direction)"
            />
          </section>

          <BoardView
            v-else
            :columns="columns"
            :filtering="filters.isActive.value"
            :availability="availability"
            :has-any-task="!showEmptyState"
            @create="openCreateForm()"
            @add="openCreateForm($event)"
            @edit="openEditForm"
            @delete="requestDelete"
            @status="onStatusChange"
            @move="onMove"
            @reorder="onReorder"
          />
        </template>
      </template>

      <p class="sr-only" role="status">
        {{ columns.map((column) => `${STATUS_LABELS[column.status]} ${column.tasks.length} 条`).join('，') }}
      </p>
    </main>

    <TaskForm
      :open="formOpen"
      :task="editingTask"
      :preset-status="presetStatus"
      @close="closeForm"
      @submit="submitForm"
    />

    <TaskDeleteDialog
      :open="deleteTarget !== null"
      :task="deleteTarget"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
