import { store } from '../store.js';
import { formatDate, getHolidayName } from '../holidays.js';

export const TaskTable = {
  template: `
    <div class="card">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-3">
        <div class="flex items-center gap-2">
          <button class="btn-pill bg-emerald-600 text-white text-xs admin-only" @click="addTask">+ 新增工序</button>
          <span class="text-xs text-slate-400 hidden sm:inline">💡 按住抓手 ☰ 可上下拖動調整排序</span>
        </div>

        <!-- ⏸️ 扣除假期與週末選項 -->
        <div class="flex items-center gap-2 bg-indigo-50/60 dark:bg-slate-800 p-2 rounded-xl border border-indigo-100/50 dark:border-slate-700">
          <input type="checkbox" id="excludeHolidaysCheck" v-model="store.appData.excludeHolidays" class="w-4 h-4 accent-indigo-600 cursor-pointer">
          <label for="excludeHolidaysCheck" class="text-xs font-bold text-indigo-900 dark:text-indigo-300 cursor-pointer select-none">
            工期自動扣除星期六、日及公眾假期
          </label>
        </div>
      </div>

      <!-- 桌面端表格 -->
      <div class="desktop-table overflow-x-auto">
        <table>
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-800">
              <th class="w-12 admin-only">排序</th>
              <th class="w-12">序</th>
              <th>階段</th>
              <th>內容</th>
              <th>前置</th>
              <th>開始日期</th>
              <th>結束日期</th>
              <th>天數</th>
              <th class="admin-only">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(task, idx) in tasks" :key="task.id"
                :draggable="!store.isReadOnlyMode"
                @dragstart="onDragStart($event, idx)"
                @dragover.prevent="onDragOver($event, idx)"
                @dragleave="dragOverIndex = -1"
                @drop="onDrop(idx)"
                :class="{ 'drag-over': dragOverIndex === idx, 'dragging-row': draggedIndex === idx }">
              
              <td class="admin-only">
                <span class="drag-handle text-base" title="按住拖拽排序">☰</span>
              </td>
              <td class="font-bold text-slate-500">{{ idx + 1 }}</td>
              <td>
                <select v-model="task.stage" class="text-xs p-1" @change="store.saveStateSnapshot()">
                  <option v-for="s in store.appData.stageList" :key="s.name" :value="s.name">{{ s.name }}</option>
                </select>
              </td>
              <td><input v-model="task.content" class="text-xs p-1 font-bold" @change="store.saveStateSnapshot()"></td>
              <td>
                <span class="text-indigo-600 font-bold" v-if="task.dependsOn">#{{ getTaskIndex(task.dependsOn) }}</span>
                <span class="text-slate-300" v-else>-</span>
              </td>
              <td><input type="date" v-model="task.start" class="text-xs p-1" @change="onDateChange(task)"></td>
              <td><input type="date" v-model="task.end" class="text-xs p-1" @change="onDateChange(task)"></td>
              <td class="font-bold text-indigo-600">{{ calcDay(task.start, task.end) }}</td>
              <td class="admin-only">
                <button class="text-indigo-600 font-bold mr-2" @click="$emit('edit-task', task.id)">✏️</button>
                <button class="text-rose-500 font-bold" @click="removeTask(task.id)">&times;</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 手機端卡片模式 -->
      <div class="mobile-task-list">
        <div v-for="(task, idx) in tasks" :key="'m_'+task.id" class="mobile-task-card">
          <div class="flex justify-between items-center mb-2 pb-1.5 border-b">
            <div class="flex items-center gap-2">
              <span class="drag-handle text-base admin-only"
                    @touchstart="onTouchStart($event, idx)"
                    @touchmove="onTouchMove($event)"
                    @touchend="onTouchEnd(idx)">☰</span>
              <span class="font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">#{{ idx + 1 }} {{ task.stage }}</span>
            </div>
            <div class="flex gap-2 admin-only">
              <button class="text-indigo-600 font-bold text-xs" @click="$emit('edit-task', task.id)">✏️ 編輯</button>
              <button class="text-rose-500 font-bold text-xs" @click="removeTask(task.id)">&times;</button>
            </div>
          </div>
          <div class="font-bold text-sm mb-1">{{ task.content }}</div>
          <div class="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>起：<input type="date" v-model="task.start" class="p-1 w-full" @change="onDateChange(task)"></div>
            <div>止：<input type="date" v-model="task.end" class="p-1 w-full" @change="onDateChange(task)"></div>
          </div>
          <div class="text-xs font-bold text-indigo-600">天數：{{ calcDay(task.start, task.end) }} 天</div>
        </div>
      </div>
    </div>
  `,
  emits: ['edit-task'],
  setup() {
    const draggedIndex = Vue.ref(-1);
    const dragOverIndex = Vue.ref(-1);
    const touchStartY = Vue.ref(0);

    const tasks = Vue.computed(() => store.appData.projects[store.appData.currentProjectId]?.tasks || []);
    function getTaskIndex(id) { const idx = tasks.value.findIndex(t => t.id === id); return idx !== -1 ? idx + 1 : '?'; }

    function addTask() {
      store.saveStateSnapshot();
      const pid = store.appData.currentProjectId;
      if (!pid) return alert("請先選擇專案");
      store.appData.projects[pid].tasks.push({
        id: Date.now(), stage: store.appData.stageList[0]?.name || "現場施工",
        content: "新工序項目", start: formatDate(new Date()), end: formatDate(new Date()),
        status: "未開始", checklists: [], dependsOn: null
      });
    }

    function removeTask(id) {
      store.saveStateSnapshot();
      const pid = store.appData.currentProjectId;
      store.appData.projects[pid].tasks = tasks.value.filter(t => t.id !== id);
    }

    function onDateChange(task) {
      store.saveStateSnapshot();
      store.propagateTaskDates(tasks.value, task.id);
    }

    /* ⏸️ 工期精確計算（含週末與公眾假期扣除） */
    function calcDay(s, e) {
      if (!s || !e) return 0;
      let cur = new Date(s);
      let end = new Date(e);
      if (isNaN(cur) || isNaN(end) || cur > end) return 0;
      if (!store.appData.excludeHolidays) return Math.ceil((end - cur) / (1000*60*60*24)) + 1;

      let workDays = 0;
      while (cur <= end) {
        const w = cur.getDay();
        const fullStr = formatDate(cur);
        const mdStr = `${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
        
        if (w !== 0 && w !== 6 && !store.appData.customHolidays?.[fullStr] && !getHolidayName(cur.getFullYear(), mdStr)) {
          workDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return workDays;
    }

    /* 拖拽事件 */
    function onDragStart(e, idx) { draggedIndex.value = idx; e.dataTransfer.effectAllowed = 'move'; }
    function onDragOver(e, idx) { dragOverIndex.value = idx; }
    function onDrop(targetIdx) {
      if (draggedIndex.value !== -1 && draggedIndex.value !== targetIdx) {
        store.saveStateSnapshot();
        const list = tasks.value;
        const movedItem = list.splice(draggedIndex.value, 1)[0];
        list.splice(targetIdx, 0, movedItem);
      }
      draggedIndex.value = -1; dragOverIndex.value = -1;
    }

    function onTouchStart(e, idx) { draggedIndex.value = idx; touchStartY.value = e.touches[0].clientY; }
    function onTouchMove(e) { e.preventDefault(); }
    function onTouchEnd(idx) { draggedIndex.value = -1; }

    return {
      store, tasks, draggedIndex, dragOverIndex, getTaskIndex, addTask, removeTask, onDateChange, calcDay,
      onDragStart, onDragOver, onDrop, onTouchStart, onTouchMove, onTouchEnd
    };
  }
};
