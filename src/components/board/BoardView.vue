<script setup>
import { STATUS_LABELS } from '@/constants'
import BoardColumn from './BoardColumn.vue'
import EmptyState from '@/components/common/EmptyState.vue'

defineProps({
  columns: { type: Array, required: true },
  filtering: { type: Boolean, default: false },
  availability: { type: Function, required: true },
  hasAnyTask: { type: Boolean, default: false },
})

defineEmits(['add', 'edit', 'delete', 'status', 'move', 'create', 'reorder'])
</script>

<template>
  <div class="flex flex-col gap-4">
    <EmptyState
      v-if="!hasAnyTask"
      title="还没有任何任务"
      description="创建第一条任务，开始跟踪你的进度。"
      action-label="新建任务"
      @action="$emit('create')"
    />

    <!-- 768–1023 px 横向滚动保持三列语义；≥1024 px 三列等宽并排（NFR-03 / TBD-04） -->
    <div class="overflow-x-auto pb-2">
      <div class="grid min-w-[720px] grid-cols-3 gap-4 lg:min-w-0">
        <BoardColumn
          v-for="column in columns"
          :key="column.status"
          :column="column"
          :filtering="filtering"
          :availability="availability"
          @add="$emit('add', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @status="(id, status) => $emit('status', id, status)"
          @move="(id, direction) => $emit('move', id, direction)"
          @reorder="(id, targetId, after) => $emit('reorder', id, targetId, after)"
        />
      </div>
    </div>
    <p class="sr-only">{{ columns.map((c) => STATUS_LABELS[c.status]).join('、') }}</p>
  </div>
</template>
