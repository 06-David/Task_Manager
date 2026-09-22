<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { DEFAULTS, LIMITS, PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '@/constants'
import { validateDescription, validateTaskForm, validateTitle } from '@/models/validation'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
  presetStatus: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const form = ref({ title: '', description: '', priority: DEFAULTS.priority, status: DEFAULTS.status })
const errors = ref({})
const titleInput = ref(null)
const descInput = ref(null)

const priorityOptions = PRIORITY_ORDER.map((value) => ({ value, label: `${PRIORITY_LABELS[value]}` }))
const statusOptions = STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))

const isEdit = computed(() => props.task !== null)
const titleCount = computed(() => form.value.title.trim().length)
const descCount = computed(() => form.value.description.trim().length)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    // 打开即快照当前值；草稿不持久化，关闭即丢弃（FR-01 规则 9）
    form.value = props.task
      ? {
          title: props.task.title,
          description: props.task.description,
          priority: props.task.priority,
          status: props.task.status,
        }
      : { title: '', description: '', priority: DEFAULTS.priority, status: props.presetStatus || DEFAULTS.status }
    errors.value = {}
    await nextTick()
    titleInput.value?.focus()
  },
  { immediate: true },
)

function onTitleBlur() {
  const error = validateTitle(form.value.title)
  errors.value = { ...errors.value, title: error ?? '' }
}

function onDescBlur() {
  const error = validateDescription(form.value.description)
  errors.value = { ...errors.value, description: error ?? '' }
}

function onTitleInput() {
  if (errors.value.title) onTitleBlur()
}

function onDescInput() {
  if (errors.value.description) onDescBlur()
}

/** 提交按钮不禁用，点击后全量校验并聚焦首个错误字段（FR-11 规则 4） */
async function submit() {
  const result = validateTaskForm(form.value)
  errors.value = { ...result.errors }
  if (!result.valid) {
    await nextTick()
    const field = result.firstErrorField
    if (field === 'title') titleInput.value?.focus()
    if (field === 'description') descInput.value?.focus()
    return
  }
  emit('submit', {
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    priority: form.value.priority,
    status: form.value.status,
  })
}
</script>

<template>
  <AppModal :open="open" :title="isEdit ? '编辑任务' : '新建任务'" :confirm-label="isEdit ? '保存' : '创建'" @close="$emit('close')" @confirm="submit">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1">
        <label for="task-title" class="text-sm font-medium">标题 <span class="text-[var(--color-danger)]">*</span></label>
        <input
          id="task-title"
          ref="titleInput"
          v-model="form.title"
          type="text"
          class="rounded-md border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
          :class="errors.title ? 'border-[var(--color-danger)]' : 'border-[var(--color-line)]'"
          :aria-describedby="errors.title ? 'task-title-error' : undefined"
          :aria-invalid="Boolean(errors.title)"
          maxlength="120"
          @blur="onTitleBlur"
          @input="onTitleInput"
        />
        <div class="flex items-center justify-between text-xs">
          <p v-if="errors.title" id="task-title-error" role="alert" class="text-[var(--color-danger)]">
            {{ errors.title }}
          </p>
          <span v-else></span>
          <span class="text-[var(--color-ink-muted)]">{{ titleCount }}/{{ LIMITS.TITLE_MAX }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label for="task-desc" class="text-sm font-medium">描述</label>
        <textarea
          id="task-desc"
          ref="descInput"
          v-model="form.description"
          rows="3"
          class="rounded-md border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
          :class="errors.description ? 'border-[var(--color-danger)]' : 'border-[var(--color-line)]'"
          :aria-describedby="errors.description ? 'task-desc-error' : undefined"
          @blur="onDescBlur"
          @input="onDescInput"
        ></textarea>
        <div class="flex items-center justify-between text-xs">
          <p v-if="errors.description" id="task-desc-error" role="alert" class="text-[var(--color-danger)]">
            {{ errors.description }}
          </p>
          <span v-else></span>
          <span class="text-[var(--color-ink-muted)]">{{ descCount }}/{{ LIMITS.DESC_MAX }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AppSelect v-model="form.priority" label="优先级" :options="priorityOptions" :placeholder="''" />
        <AppSelect v-model="form.status" label="状态" :options="statusOptions" :placeholder="''" />
      </div>
    </form>
  </AppModal>
</template>
