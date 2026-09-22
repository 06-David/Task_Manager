<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
})

defineEmits(['action'])
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-6 py-12 text-center">
    <svg viewBox="0 0 24 24" class="h-10 w-10 text-[var(--color-ink-muted)]" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 10h8M8 14h5" stroke-linecap="round" />
    </svg>
    <p class="font-medium text-[var(--color-ink)]">{{ title }}</p>
    <p v-if="description" class="max-w-md text-sm text-[var(--color-ink-muted)]">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-ink)]"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
