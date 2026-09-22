<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  label: { type: String, required: true },
})

const tone = computed(() => {
  if (props.status === 'done') return 'bg-[var(--color-pri-low)]/15 text-[var(--color-pri-low)]'
  if (props.status === 'doing') return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
  return 'bg-[var(--color-ink-muted)]/15 text-[var(--color-ink-muted)]'
})
</script>

<template>
  <span class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="tone">
    {{ label }}
  </span>
</template>
