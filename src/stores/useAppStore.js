import { defineStore } from 'pinia';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "8k51yPMqdWNUOMGw60bkRgRfBL3IfrnUbIZgGW9L",
  authDomain: "ffee-studio-working-list.firebaseapp.com",
  databaseURL: "[https://ffee-studio-working-list-default-rtdb.firebaseio.com](https://ffee-studio-working-list-default-rtdb.firebaseio.com)",
  projectId: "ffee-studio-working-list",
  storageBucket: "ffee-studio-working-list.firebasestorage.app"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const db = firebase.database();
export const storage = firebase.storage();
export const cloudRef = db.ref('decorScheduleData');

export const useAppStore = defineStore('appStore', {
  state: () => ({
    isReadOnlyMode: false,
    cloudConnected: false,
    appData: {
      loginPassword: "",
      projectList: [],
      currentProjectId: null,
      excludeHolidays: false,
      themeMode: 'light',
      fontSize: 'md',
      staffList: ["陳大文", "張師傅", "李工"],
      stageList: [
        { name: "設計準備與啟動", color: "#2563eb" },
        { name: "方案設計", color: "#0891b2" },
        { name: "施工圖設計", color: "#059669" },
        { name: "施工準備", color: "#d97706" },
        { name: "現場施工", color: "#dc2626" },
        { name: "竣工驗收", color: "#7c3aed" }
      ],
      projects: {},
      customHolidays: {}
    },
    undoStack: []
  }),

  getters: {
    currentProject: (state) => state.appData.projects[state.appData.currentProjectId] || {},
    currentTasks: (state) => state.appData.projects[state.appData.currentProjectId]?.tasks || [],
    currentMaterials: (state) => state.appData.projects[state.appData.currentProjectId]?.materials || [],
    currentSiteLogs: (state) => state.appData.projects[state.appData.currentProjectId]?.siteLogs || []
  },

  actions: {
    initCloudSync() {
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get('view');
      if (viewId) this.isReadOnlyMode = true;

      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.appData = Object.assign(this.appData, data);
          this.cloudConnected = true;
        }
        if (viewId && this.appData.projects[viewId]) {
          this.appData.currentProjectId = viewId;
        }
        this.applyTheme();
        this.applyFontSize();
      });
    },

    saveStateSnapshot() {
      if (this.isReadOnlyMode) return;
      if (this.undoStack.length >= 20) this.undoStack.shift();
      this.undoStack.push(JSON.parse(JSON.stringify(this.appData)));
    },

    undo() {
      if (this.isReadOnlyMode || this.undoStack.length === 0) return;
      this.appData = this.undoStack.pop();
      this.applyTheme();
      this.applyFontSize();
    },

    saveToCloud() {
      if (this.isReadOnlyMode) return;
      cloudRef.set(this.appData)
        .then(() => alert('☁️ 已成功同步至雲端！'))
        .catch(err => alert('❌ 儲存失敗：' + err.message));
    },

    applyTheme() {
      document.body.classList.toggle('dark-mode', this.appData.themeMode === 'dark');
    },

    applyFontSize() {
      document.body.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
      document.body.classList.add(`font-size-${this.appData.fontSize || 'md'}`);
    },

    // 🔗 前置任務自動順延演算法
    propagateTaskDates(tasks) {
      let changed = true;
      while (changed) {
        changed = false;
        tasks.forEach(t => {
          if (t.dependsOn) {
            const parent = tasks.find(p => p.id === t.dependsOn);
            if (parent && parent.end) {
              const reqStart = this.addDaysStr(parent.end, 1);
              if (new Date(t.start) < new Date(reqStart)) {
                const duration = this.getDaysBetween(t.start, t.end);
                t.start = reqStart;
                t.end = this.addDaysStr(t.start, duration);
                changed = true;
              }
            }
          }
        });
      }
    },

    getDaysBetween(sStr, eStr) {
      return Math.round((new Date(eStr) - new Date(sStr)) / (1000 * 60 * 60 * 24));
    },

    addDaysStr(dateStr, days) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
  }
});
