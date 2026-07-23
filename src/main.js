import { createApp, ref, reactive, computed, onMounted } from 'vue';

// Firebase 初始化配置
const firebaseConfig = {
  apiKey: "8k51yPMqdWNUOMGw60bkRgRfBL3IfrnUbIZgGW9L",
  authDomain: "ffee-studio-working-list.firebaseapp.com",
  databaseURL: "https://ffee-studio-working-list-default-rtdb.firebaseio.com",
  projectId: "ffee-studio-working-list",
  storageBucket: "ffee-studio-working-list.firebasestorage.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
const cloudRef = db.ref('decorScheduleData');

// 香港假期與日期工具
const fixedHolidays = { "01-01":"元旦", "05-01":"勞動節", "07-01":"特區成立紀念日", "10-01":"國慶日", "12-25":"聖誕節", "12-26":"聖誕節翌日" };
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

// UI 應用主入口
const app = createApp({
  template: `
    <div class="p-4 max-w-7xl mx-auto font-sans">
      <header class="bg-white p-4 rounded-2xl shadow border flex justify-between items-center mb-4">
        <h1 class="font-bold text-lg text-indigo-600">FFEE Studio 工程管理系統 V2.0</h1>
        <button class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs" @click="store.saveToCloud()">☁️ 同步雲端</button>
      </header>
      <div class="bg-white p-6 rounded-2xl shadow border">
        <h2 class="text-xl font-bold mb-2">專案：{{ currentProjectName || '請選擇專案' }}</h2>
        <p class="text-xs text-slate-500">已成功透過 Vite + GitHub Actions 自動構建上線！</p>
      </div>
    </div>
  `,
  setup() {
    const currentProjectName = computed(() => store.appData.projects[store.appData.currentProjectId]?.name || '');

    onMounted(() => {
      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) { store.appData = Object.assign(store.appData, data); store.cloudConnected = true; }
        store.applyTheme();
      });
    });

    return { store, currentProjectName };
  }
});

app.mount('#app');

