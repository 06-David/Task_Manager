<script setup>
import { computed } from 'vue'

const props = defineProps({
  priority: { type: String, required: true },
  label: { type: String, required: true },
  showLabel: { type: Boolean, default: true },
})

/** 优先级通过颜色和文字表达。 */
const colorVar = computed(() => `var(--color-pri-${props.priority})`)
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-1 text-xs font-medium" :style="{ color: colorVar }">
    <span class="h-3.5 w-1 shrink-0 rounded-full" :style="{ backgroundColor: colorVar }" aria-hidden="true"></span>
    <span v-if="showLabel">{{ label }}</span>
  </span>
</template>

