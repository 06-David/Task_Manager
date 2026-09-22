<script setup>
import { STATUS_LABELS } from '@/constants'

defineProps({
  status: { type: String, required: true },
  count: { type: Number, default: 0 },
  filtering: { type: Boolean, default: false },
})

defineEmits(['add'])
</script>

<template>
  <header class="mb-2 flex items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <h3 class="text-sm font-semibold text-[var(--color-ink)]">{{ STATUS_LABELS[status] }}</h3>
      <span
        class="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
        :aria-label="`${STATUS_LABELS[status]}任务数量 ${count}`"
      >
        {{ count }}{{ filtering ? ' / 已筛选' : '' }}
      </span>
    </div>
    <button
      type="button"
      class="rounded-md border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
      :aria-label="`在「${STATUS_LABELS[status]}」列新建任务`"
      @click="$emit('add')"
    >
      + 添加
    </button>
  </header>
</template>
