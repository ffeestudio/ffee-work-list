<template>
  <div class="p-4 max-w-7xl mx-auto font-sans text-slate-800">
    <input type="file" ref="fileInput" accept=".json" class="hidden admin-only" @change="handleFileImport">

    <!-- 頂部 Header & Navigation Bar -->
    <header class="bg-white/85 backdrop-blur-md sticky top-2 z-40 mb-4 py-3 px-4 flex flex-wrap justify-between items-center gap-3 rounded-2xl shadow-sm border border-slate-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
          F
        </div>
        <div>
          <h1 class="font-bold text-base md:text-lg leading-tight text-indigo-900">FFEE Studio 工程管理系統</h1>
          <p class="text-[11px] text-slate-500">室內設計排期與現場日誌系統 V2.0</p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button class="bg-slate-800 text-white hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="showSiteLogsModal = true">📷 施工日誌</button>
        <button class="bg-purple-600 text-white hover:bg-purple-700 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="showMaterialModal = true">📦 主材追蹤</button>
        <button class="bg-indigo-500 text-white hover:bg-indigo-600 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="copyClientShareLink">🔗 分享網址</button>
        <button class="bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="showSettingsModal = true">⚙️ 設定</button>
        <button class="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="store.saveToCloud()">☁️ 同步雲端</button>
      </div>
    </header>

    <div v-if="store.isReadOnlyMode" class="bg-indigo-600 text-white text-center py-2.5 px-4 font-semibold text-xs md:text-sm mb-4 rounded-xl shadow-lg flex justify-between items-center">
      <span>👀 目前為客戶唯讀檢視模式</span>
      <span class="bg-indigo-800 px-3 py-1 rounded-lg text-xs">專案：{{ currentProjectName }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- 左側邊界 -->
      <div class="flex flex-col gap-4 lg:col-span-1">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
          <span class="font-bold text-xs md:text-sm">雲端數據狀態</span>
          <span :class="['text-xs px-2.5 py-1 rounded-full font-semibold', store.cloudConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800']">
            {{ store.cloudConnected ? '🟢 已連線同步' : '🔴 連線中...' }}
          </span>
        </div>

        <!-- 迷你月曆組件 -->
        <mini-calendar></mini-calendar>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h4 class="font-bold mb-2 text-xs md:text-sm text-slate-700 flex items-center gap-1.5">📂 切換工程專案</h4>
          <select v-model="store.appData.currentProjectId" class="text-xs md:text-sm p-2 border rounded-lg w-full font-medium bg-slate-50">
            <option value="">請選擇專案</option>
            <option v-for="pid in store.appData.projectList" :key="pid" :value="pid">
              {{ store.appData.projects[pid]?.name }}
            </option>
          </select>
        </div>

        <custom-holiday-manager></custom-holiday-manager>
      </div>

      <!-- 右側主要區域 -->
      <div class="lg:col-span-3 flex flex-col gap-4">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div class="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
            <div>
              <span class="text-xs font-semibold text-indigo-600">PROJECT DASHBOARD</span>
              <h2 class="text-xl font-bold text-slate-800">{{ currentProjectName || '請選擇專案' }}</h2>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <input v-model="newProjectName" placeholder="新專案名稱" class="text-xs p-1.5 border rounded-lg w-32 bg-slate-50">
              <button class="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold" @click="addNewProject">+ 新增專案</button>
              <button class="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="renameCurrentProject">✏️ 重命名</button>
              <button class="bg-indigo-50 text-indigo-600 text-xs px-3 py-1.5 rounded-lg font-semibold" @click="saveBaseline">🔒 鎖定基準線</button>
              <button class="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold" @click="deleteCurrentProject">刪除</button>
            </div>
          </div>

          <div class="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div class="flex-1">
              <div class="flex justify-between text-xs font-bold mb-1.5">
                <span class="text-slate-600">專案總完成進度</span>
                <span class="text-indigo-600">{{ progressPercent }}%</span>
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2.5">
                <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            <div class="text-xs font-bold text-slate-700 border-l pl-4 border-slate-200">
              總天數：<span class="text-indigo-600 text-sm">{{ totalDayCount }}</span> 天
            </div>
          </div>
        </div>

        <!-- 視圖切換 (Gantt / Kanban) -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="flex justify-between items-center flex-wrap gap-3">
            <div class="flex items-center bg-slate-100 p-1 rounded-xl">
              <button :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', currentView === 'gantt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500']" @click="currentView = 'gantt'">📊 甘特圖模式</button>
              <button :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', currentView === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500']" @click="currentView = 'kanban'">📌 看板模式 (Kanban)</button>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <label class="flex items-center gap-1.5 cursor-pointer font-bold text-rose-500">
                <input type="checkbox" v-model="showCPM" class="accent-rose-500"> 🔥 CPM 關鍵路徑
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer font-medium text-slate-500">
                <input type="checkbox" v-model="showBaseline" class="accent-indigo-500"> 顯示基準線
              </label>
            </div>
          </div>
          <div v-if="currentView === 'gantt'" class="flex gap-2 items-center text-xs flex-wrap mt-3 pt-3 border-t border-slate-100">
            <div><label class="font-medium mr-1">起：</label><input type="date" v-model="customGanttStart" class="p-1 border rounded bg-slate-50"></div>
            <div><label class="font-medium mr-1">止：</label><input type="date" v-model="customGanttEnd" class="p-1 border rounded bg-slate-50"></div>
            <button class="bg-slate-200 text-slate-700 text-xs py-1.5 px-3 rounded-lg font-semibold" @click="customGanttStart=''; customGanttEnd='';">重置日期</button>
          </div>
        </div>

        <gantt-chart v-if="currentView === 'gantt'" :custom-start="customGanttStart" :custom-end="customGanttEnd" :show-cpm="showCPM" :show-baseline="showBaseline" @edit-task="openEditTaskModal"></gantt-chart>
        <kanban-view v-if="currentView === 'kanban'" @edit-task="openEditTaskModal"></kanban-view>

        <stage-manager></stage-manager>
        <task-table @edit-task="openEditTaskModal"></task-table>
      </div>
    </div>

    <!-- 編輯任務 Modal 等（簡化展示結構） -->
    <div v-if="showEditTaskModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="cancelTaskEdit">
      <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h3 class="font-bold text-lg mb-4 text-slate-800">✏️ 編輯工序</h3>
        <div v-if="editingTask" class="space-y-3 text-sm">
          <div><label class="font-bold block mb-1">工序階段</label><select v-model="editingTask.stage" class="w-full p-2 border rounded-lg bg-slate-50"><option v-for="st in store.appData.stageList" :key="st.name" :value="st.name">{{ st.name }}</option></select></div>
          <div><label class="font-bold block mb-1">工作內容</label><input type="text" v-model="editingTask.content" class="w-full p-2 border rounded-lg bg-slate-50"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold block mb-1">開始日期</label><input type="date" v-model="editingTask.start" class="w-full p-2 border rounded-lg bg-slate-50"></div>
            <div><label class="font-bold block mb-1">結束日期</label><input type="date" v-model="editingTask.end" class="w-full p-2 border rounded-lg bg-slate-50"></div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm" @click="cancelTaskEdit">取消</button>
          <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm" @click="saveTaskChanges">💾 儲存變更</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';

// Firebase 初始化配置 (支援 CDN 引入的 Compat 模式)
const firebaseConfig = {
  apiKey: "8k51yPMqdWNUOMGw60bkRgRfBL3IfrnUbIZgGW9L",
  authDomain: "ffee-studio-working-list.firebaseapp.com",
  databaseURL: "https://ffee-studio-working-list-default-rtdb.firebaseio.com",
  projectId: "ffee-studio-working-list",
  storageBucket: "ffee-studio-working-list.firebasestorage.app"
};

// 確保避免重複初始化
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const storage = firebase.storage();
const cloudRef = db.ref('decorScheduleData');

// 日期與假期工具函數
const fixedHolidays = { "01-01":"元旦", "05-01":"勞動節", "10-01":"國慶日", "12-25":"聖誕節" };
function getHolidayName(year, monthDayStr) { return fixedHolidays[monthDayStr] || null; }
function formatDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getDaysBetween(sStr, eStr) { return Math.round((new Date(eStr) - new Date(sStr)) / (1000 * 60 * 60 * 24)); }
function addDaysStr(dateStr, days) { let d = new Date(dateStr); d.setDate(d.getDate() + days); return formatDate(d); }

// 全局狀態 Store
const store = reactive({
  isReadOnlyMode: false, cloudConnected: false,
  appData: {
    projectList: [], currentProjectId: null, excludeHolidays: false,
    stageList: [
      {name:"設計準備", color:"#4f46e5"}, {name:"方案設計", color:"#0891b2"},
      {name:"施工圖設計", color:"#059669"}, {name:"現場施工", color:"#dc2626"}, {name:"竣工驗收", color:"#7c3aed"}
    ],
    projects: {}, customHolidays: {}
  },
  saveStateSnapshot() { /* ... */ },
  saveToCloud() {
    cloudRef.set(this.appData).then(() => alert('☁️ 已成功同步至雲端！')).catch(err => alert('❌ 儲存失敗：' + err.message));
  },
  propagateTaskDates(tasks, changedTaskId) { /* ... */ }
});

// 子組件：迷你月曆
const MiniCalendar = {
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-xs">
      <h3 class="font-bold mb-3 text-slate-800 text-sm">工程排期月曆</h3>
      <div class="flex justify-between mb-3">
        <select v-model="year" class="p-1.5 border rounded-lg bg-slate-50 font-semibold text-slate-700 outline-none"><option v-for="y in 6" :key="y" :value="2023+y">{{ 2023+y }}年</option></select>
        <select v-model="month" class="p-1.5 border rounded-lg bg-slate-50 font-semibold text-slate-700 outline-none"><option v-for="m in 12" :key="m" :value="m-1">{{ m }}月</option></select>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 mb-2">
        <div v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div v-for="d in totalDays" :key="'d'+d" class="text-center py-1.5 rounded-md font-semibold bg-slate-50 text-slate-700">{{ d }}</div>
      </div>
    </div>
  `,
  setup() {
    const year = ref(new Date().getFullYear()); const month = ref(new Date().getMonth());
    const totalDays = computed(() => new Date(year.value, month.value + 1, 0).getDate());
    return { year, month, totalDays };
  }
};

const CustomHolidayManager = {
  template: `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-xs"><h4 class="font-bold mb-2 text-sm text-slate-800">🗓️ 自訂放假管理</h4></div>`
};

const StageManager = {
  template: `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4"><h3 class="font-bold text-sm text-slate-800 mb-2">🎨 施工階段調色盤</h3><div class="flex gap-2 flex-wrap"><div v-for="st in store.appData.stageList" class="px-2 py-1 bg-slate-50 border rounded-lg text-xs font-bold flex items-center gap-1"><span class="w-3 h-3 rounded-full" :style="{background: st.color}"></span>{{ st.name }}</div></div></div>`,
  setup() { return { store }; }
};

const KanbanView = { template: `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">📌 Kanban 施工看板 (介面載入成功)</div>` };

const TaskTable = {
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div class="flex justify-between mb-3"><button class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold" @click="addTask">+ 新增工序</button></div>
      <table class="w-full text-xs text-left border-collapse">
        <thead><tr class="bg-slate-50 text-slate-600 border-b border-slate-200"><th class="p-3">階段</th><th class="p-3">工作內容</th><th class="p-3">操作</th></tr></thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id" class="border-b border-slate-100 hover:bg-slate-50/50">
            <td class="p-3 font-semibold text-indigo-600">{{ task.stage }}</td>
            <td class="p-3 font-bold text-slate-700">{{ task.content }}</td>
            <td class="p-3"><button class="text-indigo-600 font-bold" @click="$emit('edit-task', task.id)">✏️ 編輯</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  emits: ['edit-task'],
  setup() {
    const tasks = computed(() => store.appData.projects[store.appData.currentProjectId]?.tasks || []);
    function addTask() {
      if(!store.appData.currentProjectId) return alert('選擇專案');
      store.appData.projects[store.appData.currentProjectId].tasks.push({ id: Date.now(), stage: "現場施工", content: "新工序項目", start: formatDate(new Date()), end: formatDate(new Date()), status: "未開始" });
    }
    return { store, tasks, addTask };
  }
};

const GanttChart = {
  template: `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-x-auto"><div class="min-w-[800px] h-32 flex items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-300">📊 甘特圖視圖載入成功！</div></div>`
};

export default {
  components: { MiniCalendar, CustomHolidayManager, StageManager, KanbanView, TaskTable, GanttChart },
  setup() {
    const currentView = ref('gantt'); const showCPM = ref(false); const showBaseline = ref(true);
    const newProjectName = ref(''); const showEditTaskModal = ref(false); const editingTask = ref(null);
    const showMaterialModal = ref(false); const showSiteLogsModal = ref(false); const showSettingsModal = ref(false);
    const customGanttStart = ref(''); const customGanttEnd = ref('');
    const progressPercent = computed(() => 50); const totalDayCount = computed(() => 30);
    const currentProjectName = computed(() => store.appData.projects[store.appData.currentProjectId]?.name || '');

    onMounted(() => {
      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) { store.appData = Object.assign(store.appData, data); store.cloudConnected = true; }
      });
    });

    function addNewProject() {
      if (!newProjectName.value.trim()) return alert("請輸入專案名稱");
      const pid = 'proj_' + Date.now();
      store.appData.projectList.push(pid);
      store.appData.projects[pid] = { name: newProjectName.value.trim(), tasks: [] };
      store.appData.currentProjectId = pid;
      newProjectName.value = '';
    }

    function renameCurrentProject() {}
    function saveBaseline() {}
    function deleteCurrentProject() {}
    function copyClientShareLink() {}
    
    function openEditTaskModal(id) {
      const t = store.appData.projects[store.appData.currentProjectId].tasks.find(x => x.id === id);
      if (t) { editingTask.value = JSON.parse(JSON.stringify(t)); showEditTaskModal.value = true; }
    }
    function cancelTaskEdit() { showEditTaskModal.value = false; }
    function saveTaskChanges() {
      const pid = store.appData.currentProjectId;
      const idx = store.appData.projects[pid].tasks.findIndex(t => t.id === editingTask.value.id);
      if (idx !== -1) store.appData.projects[pid].tasks[idx] = editingTask.value;
      showEditTaskModal.value = false;
    }

    return {
      store, currentView, showCPM, showBaseline, newProjectName, currentProjectName, progressPercent, totalDayCount,
      customGanttStart, customGanttEnd, showEditTaskModal, editingTask, showMaterialModal, showSiteLogsModal, showSettingsModal,
      addNewProject, renameCurrentProject, saveBaseline, deleteCurrentProject, copyClientShareLink, openEditTaskModal,
      cancelTaskEdit, saveTaskChanges
    };
  }
}
</script>

<style>
/* 防止原生日曆圖示影響排版 */
input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
</style>


