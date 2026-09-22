<script setup>
import { onMounted, onScopeDispose, ref } from 'vue'
import { STATUS_LABELS } from '@/constants'
import BoardColumnHeader from './BoardColumnHeader.vue'
import TaskCard from '@/components/task/TaskCard.vue'

const props = defineProps({
  column: { type: Object, required: true },
  filtering: { type: Boolean, default: false },
  availability: { type: Function, required: true },
})

const emit = defineEmits(['add', 'edit', 'delete', 'status', 'move', 'reorder'])

const insertion = ref(null)
const clearInsertion = () => { insertion.value = null }
onMounted(() => {
  window.addEventListener('dragend', clearInsertion)
  window.addEventListener('drop', clearInsertion)
})
onScopeDispose(() => {
  window.removeEventListener('dragend', clearInsertion)
  window.removeEventListener('drop', clearInsertion)
})

function onDragOver(event) {
  if (!Array.from(event.dataTransfer?.types ?? []).includes('application/x-task-id')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  const card = event.target.closest('[data-task-id]')
  if (card) {
    const box = card.getBoundingClientRect()
    insertion.value = { id: card.dataset.taskId, after: event.clientY >= box.top + box.height / 2 }
  } else {
    const last = props.column.tasks.at(-1)
    insertion.value = last ? { id: last.id, after: true } : null
  }
}

function onDrop(event, status) {
  const id = event.dataTransfer?.getData('application/x-task-id')
  const position = insertion.value
  insertion.value = null
  if (!id) return
  if (props.column.tasks.some(task => task.id === id)) {
    if (position) emit('reorder', id, position.id, position.after)
  } else emit('status', id, status)
}

function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) insertion.value = null
}
</script>

<template>
  <section
    class="flex min-h-40 flex-col rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3"
    :aria-label="`${STATUS_LABELS[column.status]}列`"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @dragend="insertion = null"
    @drop.prevent="onDrop($event, column.status)"
  >
    <BoardColumnHeader
      :status="column.status"
      :count="column.tasks.length"
      :filtering="filtering"
      @add="$emit('add', column.status)"
    />

    <div class="flex max-h-[60vh] flex-1 flex-col gap-2 overflow-y-auto">
      <TaskCard
        v-for="task in column.tasks"
        :key="task.id"
        :task="task"
        :class="insertion?.id === task.id ? (insertion.after ? 'drop-after' : 'drop-before') : ''"
        :can-move-up="availability(task.id).canMoveUp"
        :can-move-down="availability(task.id).canMoveDown"
        @edit="$emit('edit', task)"
        @delete="$emit('delete', task)"
        @status="$emit('status', task.id, $event)"
        @move="$emit('move', task.id, $event)"
      />
      <p
        v-if="column.tasks.length === 0"
        class="rounded-lg border border-dashed border-[var(--color-line)] px-3 py-6 text-center text-xs text-[var(--color-ink-muted)]"
      >
        {{ filtering ? '无匹配任务' : `暂无${STATUS_LABELS[column.status]}任务` }}
      </p>
    </div>
  </section>
</template>



<style scoped>
.drop-before { box-shadow: 0 -3px 0 var(--color-accent); }
.drop-after { box-shadow: 0 3px 0 var(--color-accent); }
</style>
