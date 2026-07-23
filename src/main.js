import { createApp, ref, reactive, computed, onMounted } from 'vue';

// 透過 NPM 模組導入 Firebase，確保 Vite 打包時不崩潰
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/storage';

// Firebase 初始化配置
const firebaseConfig = {
  apiKey: "8k51yPMqdWNUOMGw60bkRgRfBL3IfrnUbIZgGW9L",
  authDomain: "ffee-studio-working-list.firebaseapp.com",
  databaseURL: "https://ffee-studio-working-list-default-rtdb.firebaseio.com",
  projectId: "ffee-studio-working-list",
  storageBucket: "ffee-studio-working-list.firebasestorage.app"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const storage = firebase.storage();
const cloudRef = db.ref('decorScheduleData');

// 🇭🇰 香港公眾假期庫
const fixedHolidays = { "01-01":"元旦", "05-01":"勞動節", "07-01":"香港特區成立紀念日", "10-01":"國慶日", "12-25":"聖誕節", "12-26":"聖誕節翌日" };
const dynamicHolidaysByYear = {
  "2024": { "02-10":"農曆年初一", "02-12":"農曆年初三", "03-29":"耶穌受難節", "04-01":"復活節", "04-04":"清明節", "05-15":"佛誕", "06-10":"端午節", "09-18":"中秋節翌日", "10-11":"重陽節" },
  "2025": { "01-29":"農曆年初一", "01-30":"農曆年初二", "04-04":"清明節", "04-18":"耶穌受難節", "05-05":"佛誕", "05-31":"端午節", "10-07":"中秋節翌日", "10-29":"重陽節" },
  "2026": { "02-17":"農曆年初一", "02-18":"農曆年初二", "04-03":"耶穌受難節", "04-06":"復活節", "05-25":"佛誕翌日", "06-19":"端午節", "09-26":"中秋節翌日", "10-19":"重陽節翌日" }
};

function getHolidayName(year, monthDayStr) {
  if (dynamicHolidaysByYear[year]?.[monthDayStr]) return dynamicHolidaysByYear[year][monthDayStr];
  return fixedHolidays[monthDayStr] || null;
}
function formatDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getDaysBetween(sStr, eStr) { return Math.round((new Date(eStr) - new Date(sStr)) / (1000 * 60 * 60 * 24)); }
function addDaysStr(dateStr, days) { let d = new Date(dateStr); d.setDate(d.getDate() + days); return formatDate(d); }

// Store 狀態中心
const store = reactive({
  isReadOnlyMode: false, cloudConnected: false,
  appData: {
    loginPassword: "", projectList: [], currentProjectId: null, excludeHolidays: false,
    themeMode: 'light', fontSize: 'md', staffList: ["陳大文", "張師傅", "李工"],
    stageList: [
      {name:"設計準備", color:"#4f46e5"}, {name:"方案設計", color:"#0891b2"},
      {name:"施工圖設計", color:"#059669"}, {name:"現場施工", color:"#dc2626"}, {name:"竣工驗收", color:"#7c3aed"}
    ],
    projects: {}, customHolidays: {}
  },
  undoStack: [],
  saveStateSnapshot() {
    if (this.isReadOnlyMode) return;
    if (this.undoStack.length >= 20) this.undoStack.shift();
    this.undoStack.push(JSON.parse(JSON.stringify(this.appData)));
  },
  saveToCloud() {
    if (this.isReadOnlyMode) return;
    cloudRef.set(this.appData).then(() => alert('☁️ 已成功同步至雲端！')).catch(err => alert('❌ 儲存失敗：' + err.message));
  },
  applyTheme() { document.body.classList.toggle('dark-mode', this.appData.themeMode === 'dark'); },
  propagateTaskDates(tasks, changedTaskId) {
    let changed = true;
    while (changed) {
      changed = false;
      tasks.forEach(t => {
        if (t.dependsOn) {
          const parent = tasks.find(p => p.id === t.dependsOn);
          if (parent && parent.end) {
            const requiredStart = addDaysStr(parent.end, 1);
            if (new Date(t.start) < new Date(requiredStart)) {
              const duration = getDaysBetween(t.start, t.end);
              t.start = requiredStart;
              t.end = addDaysStr(t.start, duration);
              changed = true;
            }
          }
        }
      });
    }
  }
});

// 1. 迷你月曆組件
const MiniCalendar = {
  template: `
    <div class="card mb-0 text-xs">
      <h3 class="font-bold mb-2">工程排期月曆</h3>
      <div class="calendar-header flex justify-between mb-2">
        <select v-model="year" class="p-1 text-xs border rounded"><option v-for="y in 8" :key="y" :value="2022+y">{{ 2022+y }}年</option></select>
        <select v-model="month" class="p-1 text-xs border rounded"><option v-for="m in 12" :key="m" :value="m-1">{{ m }}月</option></select>
      </div>
      <div class="calendar-week-row grid grid-cols-7 gap-1 text-center font-bold text-slate-400 mb-1">
        <div v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</div>
      </div>
      <div class="calendar-day-grid grid grid-cols-7 gap-1">
        <div v-for="p in firstDayWeek" :key="'p'+p" class="cal-day opacity-30 text-center py-1">{{ prevMonthLastDay - firstDayWeek + p }}</div>
        <div v-for="d in totalDays" :key="'d'+d" :class="getDayClass(d)" :title="getDayTitle(d)" class="cal-day text-center py-1 rounded">{{ d }}</div>
      </div>
    </div>
  `,
  setup() {
    const year = ref(new Date().getFullYear()); const month = ref(new Date().getMonth()); const today = new Date();
    const firstDayWeek = computed(() => new Date(year.value, month.value, 1).getDay());
    const totalDays = computed(() => new Date(year.value, month.value + 1, 0).getDate());
    const prevMonthLastDay = computed(() => new Date(year.value, month.value, 0).getDate());

    function getDayClass(d) {
      const monthDayStr = `${String(month.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const fullDateStr = `${year.value}-${monthDayStr}`;
      const isToday = year.value === today.getFullYear() && month.value === today.getMonth() && d === today.getDate();
      if (store.appData.customHolidays?.[fullDateStr]) return ['cal-custom-holiday bg-emerald-100 text-emerald-800 font-bold', isToday ? 'cal-today border-2 border-indigo-600' : ''];
      if (getHolidayName(year.value, monthDayStr)) return ['cal-holiday bg-amber-100 text-amber-800 font-bold', isToday ? 'cal-today border-2 border-indigo-600' : ''];
      if (new Date(year.value, month.value, d).getDay() % 6 === 0) return ['cal-weekend bg-rose-50 text-rose-500 font-bold', isToday ? 'cal-today border-2 border-indigo-600' : ''];
      return [isToday ? 'cal-today border-2 border-indigo-600 font-bold' : ''];
    }

    function getDayTitle(d) {
      const monthDayStr = `${String(month.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      return store.appData.customHolidays?.[`${year.value}-${monthDayStr}`] || getHolidayName(year.value, monthDayStr) || '';
    }

    return { year, month, firstDayWeek, totalDays, prevMonthLastDay, getDayClass, getDayTitle };
  }
};

// 2. 自訂假期組件
const CustomHolidayManager = {
  template: `
    <div class="card mb-0 admin-only text-xs">
      <h4 class="font-bold mb-2">🗓️ 自訂放假管理</h4>
      <div class="flex gap-2">
        <input type="date" v-model="singleDate" class="text-xs p-1 flex-1 border rounded">
        <input type="text" v-model="holidayName" placeholder="名稱" class="text-xs p-1 flex-1 border rounded">
        <button class="btn-pill bg-emerald-600 text-white text-xs px-3" @click="addHoliday">加入</button>
      </div>
    </div>
  `,
  setup() {
    const singleDate = ref(''); const holidayName = ref('');
    function addHoliday() {
      if (!singleDate.value || !holidayName.value.trim()) return alert("請填寫完整資訊");
      store.saveStateSnapshot();
      if (!store.appData.customHolidays) store.appData.customHolidays = {};
      store.appData.customHolidays[singleDate.value] = holidayName.value.trim();
      holidayName.value = '';
    }
    return { singleDate, holidayName, addHoliday };
  }
};

// 3. 施工階段調色盤組件
const StageManager = {
  template: `
    <div class="card">
      <div class="flex justify-between items-center cursor-pointer select-none text-xs md:text-sm" @click="expanded = !expanded">
        <h3 class="font-bold flex items-center gap-2">
          <span>🎨 施工階段調色盤</span>
          <span class="text-[11px] text-slate-400 font-normal">(點擊可展開編輯)</span>
        </h3>
        <button class="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border font-semibold">
          {{ expanded ? '▲ 收折' : '▼ 展開' }}
        </button>
      </div>
      <div v-if="expanded" class="mt-3 border-t pt-3 border-slate-100 dark:border-slate-800">
        <div class="flex gap-2 mb-3 admin-only text-xs">
          <input v-model="newStageName" placeholder="輸入新階段名稱" class="flex-1 p-1.5 border rounded-lg">
          <button class="btn-pill bg-indigo-600 text-white text-xs px-3" @click="addStage">加入階段</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div v-for="(st, idx) in store.appData.stageList" :key="idx" class="stage-tag text-xs font-semibold flex items-center gap-1 border p-1 rounded-lg">
            <input type="color" v-model="st.color" class="color-picker-sm" @change="store.saveStateSnapshot()">
            <input type="text" v-model="st.name" class="text-xs p-1 w-24 bg-transparent" @change="store.saveStateSnapshot()">
            <button class="text-rose-500 font-bold px-1" @click="removeStage(idx)">&times;</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const expanded = ref(false); const newStageName = ref('');
    function addStage() {
      if (!newStageName.value.trim()) return;
      store.saveStateSnapshot();
      store.appData.stageList.push({ name: newStageName.value.trim(), color: '#4f46e5' });
      newStageName.value = '';
    }
    function removeStage(idx) { store.saveStateSnapshot(); store.appData.stageList.splice(idx, 1); }
    return { store, expanded, newStageName, addStage, removeStage };
  }
};

// 4. 工序表格組件
const TaskTable = {
  template: `
    <div class="card">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-3">
        <button class="btn-pill bg-emerald-600 text-white text-xs admin-only" @click="addTask">+ 新增工序</button>
        <label class="text-xs font-bold text-indigo-900 flex items-center gap-1 cursor-pointer">
          <input type="checkbox" v-model="store.appData.excludeHolidays" class="accent-indigo-600"> 扣除六日與公眾假期
        </label>
      </div>

      <div class="desktop-table overflow-x-auto">
        <table class="w-full text-xs text-center border-collapse">
          <thead>
            <tr class="bg-slate-100 dark:bg-slate-800">
              <th class="w-12 admin-only">排序</th><th class="w-12">序</th><th>階段</th><th>內容</th><th>開始日期</th><th>結束日期</th><th>天數</th><th class="admin-only">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(task, idx) in tasks" :key="task.id" class="border-b">
              <td class="admin-only"><span class="drag-handle cursor-grab">☰</span></td>
              <td class="p-2 font-bold">{{ idx + 1 }}</td>
              <td>
                <select v-model="task.stage" class="p-1 border rounded" @change="store.saveStateSnapshot()">
                  <option v-for="s in store.appData.stageList" :key="s.name" :value="s.name">{{ s.name }}</option>
                </select>
              </td>
              <td><input v-model="task.content" class="p-1 border rounded font-bold" @change="store.saveStateSnapshot()"></td>
              <td><input type="date" v-model="task.start" class="p-1 border rounded" @change="onDateChange(task)"></td>
              <td><input type="date" v-model="task.end" class="p-1 border rounded" @change="onDateChange(task)"></td>
              <td class="font-bold text-indigo-600">{{ calcDay(task.start, task.end) }}</td>
              <td class="admin-only">
                <button class="text-indigo-600 font-bold mr-2" @click="$emit('edit-task', task.id)">✏️</button>
                <button class="text-rose-500 font-bold" @click="removeTask(task.id)">&times;</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  emits: ['edit-task'],
  setup() {
    const tasks = computed(() => store.appData.projects[store.appData.currentProjectId]?.tasks || []);
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
    function removeTask(id) { store.saveStateSnapshot(); const pid = store.appData.currentProjectId; store.appData.projects[pid].tasks = tasks.value.filter(t => t.id !== id); }
    function onDateChange(task) { store.saveStateSnapshot(); store.propagateTaskDates(tasks.value, task.id); }
    function calcDay(s, e) {
      if (!s || !e) return 0;
      let cur = new Date(s); let end = new Date(e);
      if (isNaN(cur) || isNaN(end) || cur > end) return 0;
      if (!store.appData.excludeHolidays) return Math.ceil((end - cur) / (1000*60*60*24)) + 1;
      let workDays = 0;
      while (cur <= end) {
        const w = cur.getDay(); const fullStr = formatDate(cur); const mdStr = `${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
        if (w !== 0 && w !== 6 && !store.appData.customHolidays?.[fullStr] && !getHolidayName(cur.getFullYear(), mdStr)) workDays++;
        cur.setDate(cur.getDate() + 1);
      }
      return workDays;
    }
    return { store, tasks, addTask, removeTask, onDateChange, calcDay };
  }
};

// 5. 甘特圖組件
const GanttChart = {
  props: ['customStart', 'customEnd', 'showCpm', 'showBaseline'],
  emits: ['edit-task'],
  template: `
    <div class="card overflow-x-auto">
      <div class="min-w-[850px]">
        <div class="flex border-b font-bold text-xs py-2 bg-slate-50">
          <div class="w-48 px-2 border-r">工序任務</div>
          <div class="flex-1 flex text-center">
            <div v-for="d in 30" :key="d" class="w-8 border-r text-[10px]">{{ d }}</div>
          </div>
        </div>
        <div v-for="task in validTasks" :key="task.id" class="flex border-b text-xs py-2 items-center">
          <div class="w-48 px-2 border-r font-semibold">{{ task.content }}</div>
          <div class="flex-1 relative h-6">
            <div class="absolute h-5 rounded text-[10px] text-white px-2 flex items-center shadow cursor-pointer" 
                 :style="{ left: getPos(task).left + 'px', width: getPos(task).width + 'px', background: getStageColor(task.stage) }"
                 @click="$emit('edit-task', task.id)">
              {{ task.content }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props) {
    const tasks = computed(() => store.appData.projects[store.appData.currentProjectId]?.tasks || []);
    const validTasks = computed(() => tasks.value.filter(t => t.start && t.end));
    function getPos(task) {
      const s = new Date(task.start); const e = new Date(task.end);
      const left = Math.max(0, Math.round((s - new Date()) / (1000*60*60*24)) * 25 + 100);
      const width = Math.max(50, (Math.round((e - s) / (1000*60*60*24)) + 1) * 25);
      return { left, width };
    }
    function getStageColor(stageName) { return store.appData.stageList.find(s => s.name === stageName)?.color || '#4f46e5'; }
    return { validTasks, getPos, getStageColor };
  }
};

// 建立主程式
const app = createApp({
  template: `
    <div class="p-4 max-w-7xl mx-auto font-sans">
      <header class="card flex justify-between items-center py-3 mb-4">
        <h1 class="font-bold text-lg text-indigo-600">FFEE Studio 工程管理系統 V2.0</h1>
        <button class="btn-pill bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg" @click="store.saveToCloud()">☁️ 同步雲端</button>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div class="flex flex-col gap-4 lg:col-span-1">
          <mini-calendar></mini-calendar>
          <custom-holiday-manager></custom-holiday-manager>
        </div>

        <div class="lg:col-span-3 flex flex-col gap-4">
          <div class="card p-4">
            <h2 class="text-xl font-bold mb-2">{{ currentProjectName || '請選擇專案' }}</h2>
            <div class="flex gap-2">
              <input v-model="newProjectName" placeholder="新專案名稱" class="text-xs p-1.5 border rounded">
              <button class="btn-pill bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg" @click="addNewProject">+ 新增專案</button>
            </div>
          </div>

          <gantt-chart @edit-task="openEditTaskModal"></gantt-chart>
          <stage-manager></stage-manager>
          <task-table @edit-task="openEditTaskModal"></task-table>
        </div>
      </div>
    </div>
  `,
  setup() {
    const newProjectName = ref('');
    const currentProjectName = computed(() => store.appData.projects[store.appData.currentProjectId]?.name || '');

    onMounted(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get('view');
      if (viewId) store.isReadOnlyMode = true;

      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) { store.appData = Object.assign(store.appData, data); store.cloudConnected = true; }
        if (viewId && store.appData.projects[viewId]) store.appData.currentProjectId = viewId;
        store.applyTheme();
      });
    });

    function addNewProject() {
      if (!newProjectName.value.trim()) return alert("請輸入專案名稱");
      store.saveStateSnapshot();
      const pid = 'proj_' + Date.now();
      store.appData.projectList.push(pid);
      store.appData.projects[pid] = { name: newProjectName.value.trim(), tasks: [], siteLogs: [], materials: [] };
      store.appData.currentProjectId = pid;
      newProjectName.value = '';
    }

    function openEditTaskModal(id) { alert("編輯任務 ID: " + id); }

    return { store, newProjectName, currentProjectName, addNewProject, openEditTaskModal };
  }
});

app.component('mini-calendar', MiniCalendar);
app.component('custom-holiday-manager', CustomHolidayManager);
app.component('stage-manager', StageManager);
app.component('task-table', TaskTable);
app.component('gantt-chart', GanttChart);

app.mount('#app');

