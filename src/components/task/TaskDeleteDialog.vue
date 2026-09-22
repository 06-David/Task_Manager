<script setup>
import { computed } from 'vue'
import AppModal from '@/components/common/AppModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
})

defineEmits(['close', 'confirm'])

/** 回显标题，超长截断至 30 字符（FR-04 规则 3） */
const displayTitle = computed(() => {
  const title = props.task?.title ?? ''
  return title.length > 30 ? `${title.slice(0, 30)}…` : title
})
</script>

<template>
  <AppModal
    :open="open"
    title="删除任务"
    variant="danger"
    confirm-label="确认删除"
    :auto-focus-cancel="true"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <p class="text-sm text-[var(--color-ink)]">
      确定要删除任务「<span class="font-medium">{{ displayTitle }}</span>」吗？
    </p>
    <p class="mt-2 text-sm text-[var(--color-ink-muted)]">删除后不可恢复。</p>
  </AppModal>
</template>
