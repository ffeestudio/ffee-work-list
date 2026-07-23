import { createApp, ref, reactive, computed, onMounted } from 'vue';

// Firebase 配置
const firebaseConfig = {
  apiKey: "8k51yPMqdWNUOMGw60bkRgRfBL3IfrnUbIZgGW9L",
  authDomain: "ffee-studio-working-list.firebaseapp.com",
  databaseURL: "https://ffee-studio-working-list-default-rtdb.firebaseio.com",
  projectId: "ffee-studio-working-list",
  storageBucket: "ffee-studio-working-list.firebasestorage.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const cloudRef = db.ref('decorScheduleData');

const store = reactive({
  cloudConnected: false,
  appData: { projects: {}, currentProjectId: null }
});

const app = createApp({
  template: `
    <div class="min-h-screen bg-slate-100 p-6">
      <div class="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-xl font-bold text-indigo-600">FFEE Studio 工程進度管理系統</h1>
          <span class="text-xs px-2.5 py-1 rounded-full font-bold" :class="store.cloudConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
            {{ store.cloudConnected ? '🟢 雲端已連線' : '🔴 連線中...' }}
          </span>
        </div>
        <p class="text-sm text-slate-600">Vite + Vue 3 系統運作正常，成功載入介面！</p>
      </div>
    </div>
  `,
  setup() {
    onMounted(() => {
      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) { store.appData = data; store.cloudConnected = true; }
      });
    });
    return { store };
  }
});

app.mount('#app');

