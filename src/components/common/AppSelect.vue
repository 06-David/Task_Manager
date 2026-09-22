<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '请选择' },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'blur'])
</script>

<template>
  <label class="flex flex-col gap-1 text-sm">
    <span v-if="label" class="font-medium text-[var(--color-ink)]">{{ label }}</span>
    <select
      :value="modelValue"
      class="rounded-md border bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)]"
      :class="error ? 'border-[var(--color-danger)]' : 'border-[var(--color-line)]'"
      @change="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </label>
</template>
