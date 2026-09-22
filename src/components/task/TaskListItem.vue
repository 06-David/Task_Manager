<script setup>
import { computed } from 'vue'
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER } from '@/constants'
import { formatRelativeTime } from '@/composables/useStats'
import PriorityBadge from './PriorityBadge.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  task: { type: Object, required: true },
  canMoveUp: { type: Boolean, default: false },
  canMoveDown: { type: Boolean, default: false },
})

defineEmits(['edit', 'delete', 'status', 'move'])

const isDone = computed(() => props.task.status === 'done')
const statusOptions = STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))
const relativeTime = computed(() => formatRelativeTime(props.task.updatedAt))
const displayTitle = computed(() => props.task.title || '(无标题)')
</script>

<template>
  <div class="flex items-center gap-3 border-b border-[var(--color-line)] px-3 py-3 last:border-b-0">
    <PriorityBadge :priority="task.priority" :label="PRIORITY_LABELS[task.priority]" class="w-14 shrink-0" />

    <div class="min-w-0 flex-1">
      <p
        class="truncate text-sm font-medium"
        :class="isDone ? 'text-[var(--color-ink-muted)] line-through' : 'text-[var(--color-ink)]'"
        :title="displayTitle"
      >
        {{ displayTitle }}
      </p>
      <p v-if="task.description" class="line-clamp-1 text-xs text-[var(--color-ink-muted)]" :title="task.description">
        {{ task.description }}
      </p>
      <p class="mt-1 text-xs text-[var(--color-ink-muted)]">更新于 {{ relativeTime }}</p>
    </div>

    <StatusBadge :status="task.status" :label="STATUS_LABELS[task.status]" />

    <select
      :value="task.status"
      class="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink)]"
      :aria-label="`切换「${displayTitle}」的状态`"
      @change="$emit('status', $event.target.value)"
    >
      <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>

    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        class="rounded p-1.5 hover:bg-[var(--color-surface-muted)] disabled:opacity-30"
        aria-label="上移"
        :title="canMoveUp ? '上移' : '已是首位，无法上移'"
        :aria-disabled="!canMoveUp"
        :disabled="!canMoveUp"
        @click="$emit('move', 'up')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded p-1.5 hover:bg-[var(--color-surface-muted)] disabled:opacity-30"
        aria-label="下移"
        :title="canMoveDown ? '下移' : '已是末位，无法下移'"
        :aria-disabled="!canMoveDown"
        :disabled="!canMoveDown"
        @click="$emit('move', 'down')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M19 12l-7 7-7-7" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded p-1.5 hover:bg-[var(--color-surface-muted)]"
        aria-label="编辑"
        title="编辑"
        @click="$emit('edit')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 20h4l10-10-4-4L4 16v4z" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-surface-muted)]"
        aria-label="删除"
        title="删除"
        @click="$emit('delete')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 7h12M9 7V5h6v2M8 7l1 13h6l1-13" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>
