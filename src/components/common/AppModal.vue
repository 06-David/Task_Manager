<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  variant: { type: String, default: 'default' },
  confirmLabel: { type: String, default: '确定' },
  cancelLabel: { type: String, default: '取消' },
  autoFocusCancel: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
  }
}

function onBackdrop() {
  emit('close')
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    @click.self="onBackdrop"
    @keydown="onKeydown"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="props.title"
      class="w-full max-w-lg rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-xl"
    >
      <h2 class="mb-4 text-lg font-semibold text-[var(--color-ink)]">{{ title }}</h2>
      <slot />
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          :autofocus="autoFocusCancel"
          class="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
          @click="$emit('close')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-accent-ink)]"
          :class="variant === 'danger' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-accent)]'"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

