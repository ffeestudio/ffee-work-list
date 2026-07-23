import { store } from '../store.js';

function checkCanComplete(task) {
  if (task.checklists && task.checklists.length > 0) {
    if (task.checklists.some(c => !c.isDone)) {
      alert("⚠️ 必須完成所有子清單項目，才能將狀態設為「已完成」！");
      return false;
    }
  }
  return true;
}

export const KanbanView = {
  template: `
    <div class="card">
      <h3 class="font-bold text-sm mb-3">📌 看板模式 (Kanban)</h3>
      <div class="kanban-board">
        <div v-for="col in columns" :key="col.status" class="kanban-col">
          <div class="font-bold text-xs mb-2 flex justify-between items-center">
            <span>{{ col.title }}</span>
            <span class="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px]">{{ getTasks(col.status).length }}</span>
          </div>
          <div v-for="task in getTasks(col.status)" :key="task.id" class="kanban-card text-xs">
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-indigo-600">{{ task.stage }}</span>
              <button class="text-indigo-600 font-bold" @click="$emit('edit-task', task.id)">✏️</button>
            </div>
            <div class="font-bold mb-1">{{ task.content }}</div>
            <div class="text-[10px] text-slate-400 mb-2">{{ task.start }} ~ {{ task.end }}</div>
            <select :value="task.status" class="w-full text-xs p-1 border rounded" @change="onStatusChange(task, $event)">
              <option value="未開始">未開始</option>
              <option value="進行中">進行中</option>
              <option value="已完成">已完成</option>
              <option value="已延期">已延期</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
  emits: ['edit-task'],
  setup() {
    const columns = [
      { title: "⏳ 未開始", status: "未開始" },
      { title: "▶️ 進行中", status: "進行中" },
      { title: "✓ 已完成", status: "已完成" },
      { title: "⚠️ 已延期", status: "已延期" }
    ];

    const tasks = Vue.computed(() => store.appData.projects[store.appData.currentProjectId]?.tasks || []);
    function getTasks(s) { return tasks.value.filter(t => t.status === s); }

    function onStatusChange(task, e) {
      const val = e.target.value;
      if (val === '已完成' && !checkCanComplete(task)) { e.target.value = task.status; return; }
      store.saveStateSnapshot();
      task.status = val;
    }

    return { columns, getTasks, onStatusChange };
  }
};
