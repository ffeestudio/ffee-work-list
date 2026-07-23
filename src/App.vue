<template>
  <div>
    <input type="file" ref="fileInput" accept=".json" class="hidden admin-only" @change="handleFileImport">

    <!-- 頂部 Header & Navigation Bar -->
    <header class="card nav-glass sticky top-2 z-40 mb-4 py-3 px-4 flex flex-wrap justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
          F
        </div>
        <div>
          <h1 class="font-bold text-base md:text-lg leading-tight">FFEE Studio 工程管理系統</h1>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">室內設計排期與現場日誌系統 V2.0</p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button class="btn-pill bg-slate-800 text-white hover:bg-slate-700 text-xs" @click="showSiteLogsModal = true">📷 施工日誌</button>
        <button class="btn-pill bg-purple-600 text-white hover:bg-purple-700 text-xs" @click="showMaterialModal = true">📦 主材追蹤</button>
        <button class="btn-pill bg-indigo-500 text-white hover:bg-indigo-600 text-xs admin-only" @click="copyClientShareLink">🔗 分享網址</button>
        <button class="btn-pill bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-80 text-xs admin-only" @click="showSettingsModal = true">⚙️ 設定</button>
        <button class="btn-pill bg-emerald-600 text-white hover:bg-emerald-700 text-xs admin-only" @click="store.saveToCloud()">☁️ 同步雲端</button>
      </div>
    </header>

    <div v-if="store.isReadOnlyMode" class="bg-indigo-600 text-white text-center py-2.5 px-4 font-semibold text-xs md:text-sm mb-4 rounded-xl shadow-lg flex justify-between items-center">
      <span>👀 目前為客戶唯讀檢視模式</span>
      <span class="bg-indigo-800 px-3 py-1 rounded-lg text-xs">專案：{{ currentProjectName }}</span>
    </div>

    <div class="layout-wrap">
      <!-- 左側邊欄 -->
      <div class="flex flex-col gap-4">
        <div class="card mb-0 flex justify-between items-center py-3">
          <span class="font-bold text-xs md:text-sm">雲端數據狀態</span>
          <span :class="['text-xs px-2.5 py-1 rounded-full font-semibold', store.cloudConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800']">
            {{ store.cloudConnected ? '🟢 已連線同步' : '🔴 連線中...' }}
          </span>
        </div>

        <MiniCalendar />

        <div class="card mb-0 admin-only">
          <h4 class="font-bold mb-2 text-xs md:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">📂 切換工程專案</h4>
          <select v-model="store.appData.currentProjectId" class="text-xs md:text-sm p-2 border rounded-lg w-full font-medium">
            <option value="">請選擇專案</option>
            <option v-for="pid in store.appData.projectList" :key="pid" :value="pid">
              {{ store.appData.projects[pid]?.name }}
            </option>
          </select>
        </div>

        <CustomHolidayManager />
      </div>

      <!-- 右側主區域 -->
      <div class="main-area">
        <div class="card">
          <div class="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
            <div>
              <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">PROJECT DASHBOARD</span>
              <h2 class="text-xl font-bold">{{ currentProjectName || '請選擇專案' }}</h2>
            </div>

            <div class="flex items-center gap-2 admin-only flex-wrap">
              <input v-model="newProjectName" placeholder="新專案名稱" class="text-xs p-1.5 border rounded-lg w-32">
              <button class="btn-pill bg-indigo-600 text-white text-xs whitespace-nowrap" @click="addNewProject">+ 新增專案</button>
              <button class="btn-pill bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs" @click="renameCurrentProject">✏️ 重命名</button>
              <button class="btn-pill bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-xs" @click="saveBaseline">🔒 鎖定基準線</button>
              <button class="btn-pill bg-rose-500 text-white text-xs" @click="deleteCurrentProject">刪除</button>
            </div>
          </div>

          <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="flex-1">
              <div class="flex justify-between text-xs font-bold mb-1.5">
                <span class="text-slate-600 dark:text-slate-400">專案總完成進度</span>
                <span class="text-indigo-600 dark:text-indigo-400">{{ progressPercent }}%</span>
              </div>
              <div class="progress-wrap">
                <div class="progress-bar bg-indigo-600" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            <div class="text-xs font-bold text-slate-700 dark:text-slate-300 border-l pl-4 border-slate-200 dark:border-slate-700">
              總天數：<span class="text-indigo-600 dark:text-indigo-400 text-sm">{{ totalDayCount }}</span> 天
            </div>
          </div>
        </div>

        <!-- 視圖切換 (Gantt vs Kanban) -->
        <div class="card py-3">
          <div class="flex justify-between items-center flex-wrap gap-3">
            <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', currentView === 'gantt' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500']" @click="currentView = 'gantt'">
                📊 甘特圖模式
              </button>
              <button :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition-all', currentView === 'kanban' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500']" @click="currentView = 'kanban'">
                📌 看板模式 (Kanban)
              </button>
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
          <div v-if="currentView === 'gantt'" class="flex gap-2 items-center text-xs flex-wrap mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div><label class="font-medium">起：</label><input type="date" v-model="customGanttStart" class="p-1 text-xs"></div>
            <div><label class="font-medium">止：</label><input type="date" v-model="customGanttEnd" class="p-1 text-xs"></div>
            <button class="btn-pill bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs py-1 px-3" @click="customGanttStart=''; customGanttEnd='';">重置日期</button>
          </div>
        </div>

        <GanttChart v-if="currentView === 'gantt'" :custom-start="customGanttStart" :custom-end="customGanttEnd" :show-cpm="showCPM" :show-baseline="showBaseline" @edit-task="openEditTaskModal" />
        <KanbanView v-if="currentView === 'kanban'" @edit-task="openEditTaskModal" />

        <StageManager />
        <TaskTable @edit-task="openEditTaskModal" />
      </div>
    </div>

    <!-- 手機底部導覽列 -->
    <div class="md:hidden mobile-bottom-nav admin-only">
      <button class="mobile-nav-btn" @click="showMaterialModal = true"><span class="text-xl">📦</span><span>主材</span></button>
      <button class="mobile-nav-btn" @click="showSiteLogsModal = true"><span class="text-xl">📷</span><span>日誌</span></button>
      <button class="mobile-nav-btn active" @click="store.saveToCloud()"><span class="text-xl">☁️</span><span>儲存</span></button>
      <button class="mobile-nav-btn" @click="showSettingsModal = true"><span class="text-xl">⚙️</span><span>設定</span></button>
    </div>

    <!-- 📷 施工日誌 Modal -->
    <div v-if="showSiteLogsModal" class="modal-overlay" @click.self="showSiteLogsModal = false">
      <div class="modal-content" style="width: 750px;">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-base font-bold flex items-center gap-2">📷 現場施工日誌與照片打卡</h3>
          <button @click="showSiteLogsModal = false" class="text-slate-400 font-bold text-xl">&times;</button>
        </div>

        <div v-if="!store.isReadOnlyMode" class="bg-indigo-50/50 dark:bg-slate-800/80 p-3 rounded-xl mb-4 border border-indigo-100 text-xs">
          <h4 class="font-bold mb-2 text-indigo-700 dark:text-indigo-300">+ 發佈現場施工日誌</h4>
          <div class="grid grid-cols-3 gap-2 mb-2">
            <div><label class="block font-semibold mb-1">日期：</label><input type="date" v-model="newLogDate" class="w-full text-xs"></div>
            <div>
              <label class="block font-semibold mb-1">天氣：</label>
              <select v-model="newLogWeather" class="w-full text-xs">
                <option value="☀️ 晴天">☀️ 晴天</option>
                <option value="🌧️ 雨天">🌧️ 雨天</option>
                <option value="☁️ 陰天">☁️ 陰天</option>
              </select>
            </div>
            <div><label class="block font-semibold mb-1">記錄/施工人：</label><input type="text" v-model="newLogAuthor" placeholder="如：張師傅" class="w-full text-xs"></div>
          </div>
          <div class="mb-2">
            <textarea v-model="newLogContent" rows="2" placeholder="填寫今日現場施工狀況..." class="w-full text-xs p-2"></textarea>
          </div>
          <div class="flex items-center gap-2">
            <input type="file" ref="logPhotoFiles" multiple accept="image/*" class="text-xs flex-1">
            <button class="btn-pill bg-indigo-600 text-white text-xs px-4" :disabled="isUploading" @click="uploadSiteLog">
              {{ isUploading ? '上傳中...' : '📤 發表日誌' }}
            </button>
          </div>
        </div>

        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          <div v-if="currentSiteLogs.length === 0" class="text-center opacity-50 py-8 text-xs">暫無現場施工日誌紀錄</div>
          <div v-for="log in currentSiteLogs" :key="log.id" class="border rounded-xl p-3 bg-card-bg shadow-sm text-xs">
            <div class="flex justify-between items-center text-slate-500 mb-1 border-b pb-1">
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ log.date }} ({{ log.weather }})</span>
              <span>記錄人: {{ log.author || '管理員' }}</span>
              <button v-if="!store.isReadOnlyMode" @click="deleteSiteLog(log.id)" class="text-rose-500 font-bold hover:underline">刪除</button>
            </div>
            <p class="my-2 text-slate-700 dark:text-slate-300 font-medium">{{ log.content }}</p>
            <div v-if="log.photos && log.photos.length > 0" class="photo-grid mt-2">
              <div v-for="(img, pIdx) in log.photos" :key="pIdx" class="photo-card">
                <img :src="img.url" @click="previewImage(img.url)">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ⚙️ 系統設定 Modal -->
    <div v-if="showSettingsModal" class="modal-overlay admin-only" @click.self="showSettingsModal = false">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-base font-bold">⚙️ 系統設定面板</h3>
          <button @click="showSettingsModal = false" class="text-slate-400 font-bold text-xl">&times;</button>
        </div>
        
        <div class="mb-4 pb-3 border-b text-xs">
          <label class="font-bold block mb-1">🔒 系統存取密碼</label>
          <div class="flex gap-2">
            <input type="text" v-model="store.appData.loginPassword" placeholder="留空免密碼" class="text-xs p-2 flex-1">
            <button class="btn-pill bg-indigo-600 text-white text-xs" @click="store.saveToCloud()">儲存密碼</button>
          </div>
        </div>

        <div class="mb-4 pb-3 border-b text-xs">
          <label class="font-bold block mb-1">🎨 界面主題模式</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" v-model="store.appData.themeMode" value="light" @change="store.applyTheme()" class="accent-indigo-600"> ☀️ 明亮模式
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" v-model="store.appData.themeMode" value="dark" @change="store.applyTheme()" class="accent-indigo-600"> 🌙 暗黑模式
            </label>
          </div>
        </div>

        <div class="mb-4 pb-3 border-b text-xs">
          <label class="font-bold block mb-1">💾 資料備份與匯入</label>
          <div class="flex gap-2">
            <button class="btn-pill bg-slate-800 text-white text-xs" @click="exportFullBackupJSON">📤 匯出備份 (.json)</button>
            <button class="btn-pill bg-purple-600 text-white text-xs" @click="triggerFileInput">📥 匯入檔案</button>
          </div>
        </div>

        <div class="mb-2 text-xs">
          <label class="font-bold block mb-1">👥 施工人員清單</label>
          <div class="flex gap-2 mb-2">
            <input type="text" v-model="newStaffName" placeholder="員工姓名" class="text-xs p-2 flex-1">
            <button class="btn-pill bg-indigo-600 text-white text-xs" @click="addStaff">新增</button>
          </div>
          <div class="flex flex-col gap-1 max-h-28 overflow-y-auto border p-2 rounded-xl">
            <div v-for="(st, idx) in store.appData.staffList" :key="idx" class="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg">
              <span>{{ st }}</span>
              <button @click="removeStaff(idx)" class="text-rose-500 font-bold px-2">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end mt-4">
          <button class="btn-pill bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs" @click="showSettingsModal = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- 📦 主材追蹤 Modal -->
    <div v-if="showMaterialModal" class="modal-overlay" @click.self="showMaterialModal = false">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-base font-bold flex items-center gap-2">📦 主材進場時間追蹤</h3>
          <button @click="showMaterialModal = false" class="text-slate-400 font-bold text-xl">&times;</button>
        </div>
        
        <div v-if="!store.isReadOnlyMode" class="flex flex-wrap gap-2 mb-4 p-3 bg-indigo-50/50 dark:bg-slate-800 rounded-xl border text-xs">
          <input type="text" v-model="newMaterial.name" placeholder="主材名稱 (如: 磁磚)" class="p-2 flex-1 min-w-[120px]">
          <input type="date" v-model="newMaterial.expectedDate" class="p-2">
          <select v-model="newMaterial.status" class="p-2">
            <option value="待訂購">待訂購</option>
            <option value="已訂購">已訂購</option>
            <option value="已進場">✅ 已進場</option>
          </select>
          <button class="btn-pill bg-indigo-600 text-white px-4" @click="addMaterial">+ 新增紀錄</button>
        </div>

        <div class="overflow-x-auto text-xs">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-100 dark:bg-slate-800">
                <th class="p-2.5">主材名稱</th><th class="p-2.5">預計進場日</th><th class="p-2.5">狀態</th><th class="p-2.5">備註</th><th v-if="!store.isReadOnlyMode" class="p-2.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mat in currentMaterials" :key="mat.id">
                <td class="p-2.5 font-bold">{{ mat.name }}</td>
                <td class="p-2.5">{{ mat.expectedDate }}</td>
                <td class="p-2.5 font-bold" :class="{'text-emerald-600': mat.status==='已進場', 'text-amber-500': mat.status==='已訂購'}">{{ mat.status }}</td>
                <td class="p-2.5">{{ mat.note || '-' }}</td>
                <td v-if="!store.isReadOnlyMode" class="p-2.5 text-center"><button class="text-rose-500 font-bold" @click="removeMaterial(mat.id)">刪除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 編輯任務 Modal -->
    <div v-if="showEditTaskModal" class="modal-overlay" @click.self="cancelTaskEdit">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-base font-bold">✏️ 編輯工序與驗收子清單</h3>
          <button @click="cancelTaskEdit" class="text-slate-400 font-bold text-xl">&times;</button>
        </div>
        <div v-if="editingTask" class="flex flex-col gap-3 text-xs md:text-sm">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold block mb-1">工序階段</label><select v-model="editingTask.stage" class="w-full text-xs"><option v-for="st in store.appData.stageList" :key="st.name" :value="st.name">{{ st.name }}</option></select></div>
            <div><label class="font-bold block mb-1">工作內容</label><input type="text" v-model="editingTask.content" class="w-full text-xs"></div>
          </div>

          <div>
            <label class="font-bold block mb-1 text-indigo-600 dark:text-indigo-400">🔗 前置任務 (Finish-to-Start)</label>
            <select v-model="editingTask.dependsOn" class="w-full text-xs">
              <option :value="null">-- 無 (獨立工序) --</option>
              <option v-for="t in possibleParents" :key="t.id" :value="t.id">
                #{{ getTaskIndex(t.id) }} {{ t.content }} (結束: {{ t.end }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold block mb-1">開始日期</label><input type="date" v-model="editingTask.start" class="w-full text-xs"></div>
            <div><label class="font-bold block mb-1">結束日期</label><input type="date" v-model="editingTask.end" class="w-full text-xs"></div>
          </div>

          <div class="border pt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <label class="font-bold block mb-2 text-indigo-600 dark:text-indigo-400">✅ 施工品質驗收子清單 (Checklist)</label>
            <div v-if="!store.isReadOnlyMode" class="flex gap-2 mb-2">
              <input type="text" v-model="newChecklistItemText" @keyup.enter="addChecklistItem" placeholder="例如: 試水壓測試 48小時" class="w-full text-xs p-2">
              <button class="btn-pill bg-indigo-600 text-white text-xs whitespace-nowrap" @click="addChecklistItem">新增</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              <div v-for="(item, idx) in editingTask.checklists" :key="item.id" class="flex items-center justify-between bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs">
                <label class="flex items-center gap-2 cursor-pointer m-0">
                  <input type="checkbox" v-model="item.isDone" :disabled="store.isReadOnlyMode" class="w-4 h-4 accent-indigo-600">
                  <span :class="{ 'line-through text-slate-400': item.isDone }">{{ item.text }}</span>
                </label>
                <button v-if="!store.isReadOnlyMode" @click="removeChecklistItem(idx)" class="text-rose-500 font-bold px-2">&times;</button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="btn-pill bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs" @click="cancelTaskEdit">取消</button>
          <button class="btn-pill bg-indigo-600 text-white text-xs admin-only" @click="saveTaskChanges">💾 儲存變更</button>
        </div>
      </div>
    </div>

    <!-- 放大照片 Modal -->
    <div v-if="previewImgUrl" class="modal-overlay" style="z-index: 10000;" @click="previewImgUrl = null">
      <div class="relative max-w-full max-h-full p-2">
        <img :src="previewImgUrl" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain">
        <button class="absolute top-4 right-4 bg-black/60 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAppStore, storage, cloudRef } from './stores/useAppStore';
import { formatDate } from './holidays';

import MiniCalendar from './components/MiniCalendar.vue';
import CustomHolidayManager from './components/CustomHolidayManager.vue';
import StageManager from './components/StageManager.vue';
import TaskTable from './components/TaskTable.vue';
import GanttChart from './components/GanttChart.vue';
import KanbanView from './components/KanbanView.vue';

const store = useAppStore();

const fileInput = ref(null);
const logPhotoFiles = ref(null);
const taskPhotoFile = ref(null);

const currentView = ref('gantt');
const showCPM = ref(false);
const showBaseline = ref(true);
const newProjectName = ref('');
const newStaffName = ref('');
const showEditTaskModal = ref(false);
const editingTask = ref(null);
const showMaterialModal = ref(false);
const showSiteLogsModal = ref(false);
const showSettingsModal = ref(false);
const newChecklistItemText = ref('');
const newMaterial = reactive({ name: '', expectedDate: formatDate(new Date()), status: '待訂購', note: '' });
const customGanttStart = ref('');
const customGanttEnd = ref('');
const previewImgUrl = ref(null);

const newLogDate = ref(formatDate(new Date()));
const newLogWeather = ref('☀️ 晴天');
const newLogAuthor = ref('');
const newLogContent = ref('');
const isUploading = ref(false);

const currentProjectName = computed(() => store.currentProject.name || '');
const currentTasks = computed(() => store.currentTasks);
const currentMaterials = computed(() => store.currentMaterials);
const currentSiteLogs = computed(() => store.currentSiteLogs);

const possibleParents = computed(() => {
  if (!editingTask.value) return [];
  return currentTasks.value.filter(t => t.id !== editingTask.value.id);
});

function getTaskIndex(id) {
  const idx = currentTasks.value.findIndex(t => t.id === id);
  return idx !== -1 ? idx + 1 : '?';
}

const progressPercent = computed(() => {
  if (currentTasks.value.length === 0) return 0;
  return Math.round((currentTasks.value.filter(t => t.status === '已完成').length / currentTasks.value.length) * 100);
});

const totalDayCount = computed(() => {
  const valid = currentTasks.value.filter(t => t.start && t.end);
  if (valid.length === 0) return 0;
  const minS = new Date(Math.min(...valid.map(t => new Date(t.start))));
  const maxE = new Date(Math.max(...valid.map(t => new Date(t.end))));
  return Math.ceil((maxE - minS) / (1000 * 60 * 60 * 24)) + 1;
});

onMounted(() => {
  store.initCloudSync();
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

function renameCurrentProject() {
  if (!store.appData.currentProjectId) return;
  const cur = store.appData.projects[store.appData.currentProjectId];
  const name = prompt("輸入新名稱", cur.name);
  if (name && name.trim()) { store.saveStateSnapshot(); cur.name = name.trim(); }
}

function deleteCurrentProject() {
  if (!store.appData.currentProjectId || !confirm("確定刪除此專案？")) return;
  store.saveStateSnapshot();
  store.appData.projectList = store.appData.projectList.filter(p => p !== store.appData.currentProjectId);
  delete store.appData.projects[store.appData.currentProjectId];
  store.appData.currentProjectId = store.appData.projectList[0] || null;
}

function saveBaseline() {
  if (!store.appData.currentProjectId) return alert("請先選擇專案");
  if (confirm("確定鎖定當前排期為初始基準線 (Baseline) 嗎？")) {
    store.saveStateSnapshot();
    currentTasks.value.forEach(t => { t.baselineStart = t.start; t.baselineEnd = t.end; });
    alert("📐 基準線鎖定成功！");
  }
}

async function uploadSiteLog() {
  const pid = store.appData.currentProjectId;
  if (!pid) return alert("請先選擇專案");
  if (!newLogContent.value.trim()) return alert("請填寫施工日誌內容");

  isUploading.value = true;
  const uploadedPhotos = [];
  const files = logPhotoFiles.value?.files || [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = storage.ref(`site_photos/${pid}/${Date.now()}_${file.name}`);
      const snapshot = await storageRef.put(file);
      const url = await snapshot.ref.getDownloadURL();
      uploadedPhotos.push({ url, name: file.name });
    }

    store.saveStateSnapshot();
    if (!store.appData.projects[pid].siteLogs) store.appData.projects[pid].siteLogs = [];
    store.appData.projects[pid].siteLogs.unshift({
      id: Date.now(), date: newLogDate.value, weather: newLogWeather.value,
      author: newLogAuthor.value.trim(), content: newLogContent.value.trim(), photos: uploadedPhotos
    });

    newLogContent.value = '';
    if (logPhotoFiles.value) logPhotoFiles.value.value = '';
    alert("📸 施工日誌發表成功！");
  } catch (err) { alert("❌ 上傳失敗: " + err.message); }
  finally { isUploading.value = false; }
}

function deleteSiteLog(logId) {
  if (confirm("確定刪除此日誌？")) {
    store.saveStateSnapshot();
    const pid = store.appData.currentProjectId;
    store.appData.projects[pid].siteLogs = store.appData.projects[pid].siteLogs.filter(l => l.id !== logId);
  }
}

function addMaterial() {
  if (!newMaterial.name) return;
  store.saveStateSnapshot();
  const pid = store.appData.currentProjectId;
  if (!store.appData.projects[pid].materials) store.appData.projects[pid].materials = [];
  store.appData.projects[pid].materials.push({ ...newMaterial, id: Date.now() });
  newMaterial.name = '';
}

function removeMaterial(id) {
  store.appData.projects[store.appData.currentProjectId].materials = currentMaterials.value.filter(m => m.id !== id);
}

function openEditTaskModal(id) {
  const t = currentTasks.value.find(x => x.id === id);
  if (t) { editingTask.value = JSON.parse(JSON.stringify(t)); showEditTaskModal.value = true; }
}

function addChecklistItem() {
  if (!newChecklistItemText.value) return;
  if (!editingTask.value.checklists) editingTask.value.checklists = [];
  editingTask.value.checklists.push({ id: Date.now(), text: newChecklistItemText.value, isDone: false });
  newChecklistItemText.value = '';
}

function removeChecklistItem(idx) { editingTask.value.checklists.splice(idx, 1); }

function saveTaskChanges() {
  if (editingTask.value.status === '已完成' && editingTask.value.checklists?.some(c => !c.isDone)) {
    alert("⚠️ 必須完成所有子清單項目，才能將狀態設為「已完成」！");
    editingTask.value.status = '進行中';
    return;
  }
  store.saveStateSnapshot();
  const pid = store.appData.currentProjectId;
  const idx = store.appData.projects[pid].tasks.findIndex(t => t.id === editingTask.value.id);
  if (idx !== -1) {
    store.appData.projects[pid].tasks[idx] = editingTask.value;
    store.propagateTaskDates(store.appData.projects[pid].tasks);
  }
  showEditTaskModal.value = false;
}

function cancelTaskEdit() { showEditTaskModal.value = false; }

function copyClientShareLink() {
  const url = `${window.location.origin}${window.location.pathname}?view=${store.appData.currentProjectId}`;
  navigator.clipboard.writeText(url).then(() => alert("✅ 唯讀網址已複製！"));
}

function previewImage(url) { previewImgUrl.value = url; }

function addStaff() {
  if (!newStaffName.value.trim()) return;
  store.saveStateSnapshot();
  store.appData.staffList.push(newStaffName.value.trim());
  newStaffName.value = '';
}

function removeStaff(idx) { store.saveStateSnapshot(); store.appData.staffList.splice(idx, 1); }

function exportFullBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.appData, null, 2));
  const a = document.createElement('a'); a.href = dataStr; a.download = `全系統備份_${formatDate(new Date())}.json`; a.click();
}

function triggerFileInput() { fileInput.value.click(); }

function handleFileImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      store.saveStateSnapshot();
      if (imported.projects) { store.appData = Object.assign(store.appData, imported); alert("✅ 資料還原成功！"); }
    } catch(err) { alert("❌ 檔案損壞"); }
  };
  reader.readAsText(file);
}
</script>

