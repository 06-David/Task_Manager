<script setup>
defineProps({
  tone: { type: String, default: 'info' },
  message: { type: String, required: true },
})

defineEmits(['dismiss'])
</script>

<template>
  <div
    :role="tone === 'error' ? 'alert' : 'status'"
    class="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
    :class="
      tone === 'error'
        ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
        : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]'
    "
  >
    <span>{{ message }}</span>
    <button
      type="button"
      class="shrink-0 rounded px-1 text-xs underline"
      aria-label="关闭提示"
      @click="$emit('dismiss')"
    >
      关闭
    </button>
  </div>
</template>
