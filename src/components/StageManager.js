import { store } from '../store.js';

export const StageManager = {
  template: `
    <div class="card">
      <div class="flex justify-between items-center cursor-pointer select-none text-xs md:text-sm" @click="expanded = !expanded">
        <h3 class="font-bold flex items-center gap-2">
          <span>🎨 施工階段調色盤</span>
          <span class="text-[11px] text-slate-400 font-normal">(點擊可展開編輯與增加階段)</span>
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
          <div v-for="(st, idx) in store.appData.stageList" :key="idx" class="stage-tag text-xs font-semibold">
            <input type="color" v-model="st.color" class="color-picker-sm" @change="store.saveStateSnapshot()">
            <input type="text" v-model="st.name" class="text-xs p-1 w-24 bg-transparent" @change="store.saveStateSnapshot()">
            <button class="text-rose-500 font-bold px-1" @click="removeStage(idx)">&times;</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const expanded = Vue.ref(false);
    const newStageName = Vue.ref('');

    function addStage() {
      if (!newStageName.value.trim()) return;
      store.saveStateSnapshot();
      store.appData.stageList.push({ name: newStageName.value.trim(), color: '#4f46e5' });
      newStageName.value = '';
    }

    function removeStage(idx) {
      store.saveStateSnapshot();
      store.appData.stageList.splice(idx, 1);
    }

    return { store, expanded, newStageName, addStage, removeStage };
  }
};
