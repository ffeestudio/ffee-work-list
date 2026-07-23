<template>
  <div class="card" id="ganttCardCard">
    <div class="gantt-container" @mousemove="handleHover" @mouseleave="hoverIndex = -1">
      <div class="gantt-wrap" :style="{ width: Math.max(850, labelWidth + totalDays * 34) + 'px' }">
        
        <!-- 月份列 -->
        <div class="gantt-month-row">
          <div class="gantt-month-label-placeholder"></div>
          <div class="gantt-months-container">
            <div v-for="m in monthSpans" :key="m.ym" class="gantt-month-cell" :style="{ width: m.count * 34 + 'px' }">{{ m.ym }}</div>
          </div>
        </div>

        <!-- 日期標題列 -->
        <div class="gantt-header">
          <div class="gantt-task-label">工序任務</div>
          <div class="gantt-days-row">
            <div v-for="(day, i) in daysList" :key="i" :class="['gantt-day-cell', day.isWeekend ? 'gantt-day-weekend' : '']">
              {{ day.dateNum }}
            </div>
          </div>
        </div>

        <!-- 工序條與里程碑列表 -->
        <div v-for="task in validTasks" :key="task.id" class="gantt-task-row">
          <div class="gantt-task-label" :title="task.stage">{{ task.content }}</div>
          <div class="gantt-bar-box">
            <div v-for="wIdx in weekendIndexes" :key="wIdx" class="gantt-weekend-column" :style="{ left: wIdx * 34 + 'px' }"></div>
            
            <!-- Baseline 基準線 -->
            <div v-if="showBaseline && task.baselineStart && task.baselineEnd"
                 class="gantt-baseline-bar"
                 :style="{ left: getBaselinePos(task).left + 'px', width: getBaselinePos(task).width + 'px' }"></div>

            <div v-if="activeDrag && activeDrag.taskId === task.id && task.status !== '里程碑'"
                 class="gantt-ghost-bar"
                 :style="{ left: getOrigBarPos(task).left + 'px', width: getOrigBarPos(task).width + 'px' }"></div>

            <!-- 🚩 里程碑菱形 -->
            <div v-if="task.status === '里程碑'"
                 :class="['gantt-milestone-wrapper', { 'is-dragging': activeDrag?.taskId === task.id, 'is-critical': showCpm && criticalTaskIds.includes(task.id) }]"
                 :style="{ left: getDynamicBarPos(task).left + 6 + 'px' }"
                 @mousedown="startDrag($event, task, 'move')"
                 @touchstart="startDrag($event, task, 'move')">
              <div class="gantt-milestone-diamond" :style="{ background: getStageColor(task.stage) }"></div>
              <div class="gantt-milestone-text">🚩 {{ getPreviewText(task) }}</div>
            </div>

            <!-- 一般甘特圖長條 -->
            <div v-else
                 :class="['gantt-bar', getStatusClass(task.status), { 'is-dragging': activeDrag?.taskId === task.id, 'is-critical': showCpm && criticalTaskIds.includes(task.id) }]"
                 :style="{ left: getDynamicBarPos(task).left + 'px', width: getDynamicBarPos(task).width + 'px', background: getStageColor(task.stage) }">
              <div v-if="!store.isReadOnlyMode" class="gantt-handle" @mousedown.stop="startDrag($event, task, 'resize-left')" @touchstart.stop="startDrag($event, task, 'resize-left')"></div>
              <div class="gantt-bar-text" @mousedown.stop="startDrag($event, task, 'move')" @touchstart.stop="startDrag($event, task, 'move')">{{ getPreviewText(task) }}</div>
              <div v-if="!store.isReadOnlyMode" class="gantt-handle" @mousedown.stop="startDrag($event, task, 'resize-right')" @touchstart.stop="startDrag($event, task, 'resize-right')"></div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="hoverIndex >= 0" class="gantt-col-hover" :style="{ left: labelWidth + hoverIndex * 34 + 'px' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/useAppStore';

const props = defineProps(['customStart', 'customEnd', 'showCpm', 'showBaseline']);
const emit = defineEmits(['edit-task']);

const store = useAppStore();
const hoverIndex = ref(-1);
const activeDrag = ref(null);

const tasks = computed(() => store.currentTasks);
const validTasks = computed(() => tasks.value.filter(t => t.start && t.end));

const minDate = computed(() => {
  if (props.customStart) return new Date(props.customStart);
  if (validTasks.value.length === 0) return new Date();
  return new Date(Math.min(...validTasks.value.map(t => new Date(t.start))));
});

const maxDate = computed(() => {
  if (props.customEnd) return new Date(props.customEnd);
  if (validTasks.value.length === 0) return new Date();
  return new Date(Math.max(...validTasks.value.map(t => new Date(t.end))));
});

const totalDays = computed(() => Math.max(1, Math.round((maxDate.value - minDate.value) / (1000 * 60 * 60 * 24)) + 1));
const labelWidth = computed(() => window.innerWidth < 768 ? 160 : 200);

// 🔥 CPM 關鍵路徑計算
const criticalTaskIds = computed(() => {
  const taskList = validTasks.value;
  if (taskList.length === 0) return [];
  let es = {}, ef = {};
  taskList.forEach(t => {
    let parentEf = 0;
    if (t.dependsOn) {
      const p = taskList.find(x => x.id === t.dependsOn);
      if (p && ef[p.id] !== undefined) parentEf = ef[p.id];
    }
    const duration = Math.max(1, store.getDaysBetween(t.start, t.end) + 1);
    es[t.id] = parentEf;
    ef[t.id] = es[t.id] + duration;
  });

  let maxProjectDuration = Math.max(...Object.values(ef), 0);
  let lf = {}, ls = {};
  taskList.slice().reverse().forEach(t => {
    let children = taskList.filter(c => c.dependsOn === t.id);
    let minChildLs = children.length > 0 ? Math.min(...children.map(c => ls[c.id])) : maxProjectDuration;
    lf[t.id] = minChildLs;
    const duration = Math.max(1, store.getDaysBetween(t.start, t.end) + 1);
    ls[t.id] = lf[t.id] - duration;
  });

  return taskList.filter(t => (ls[t.id] - es[t.id]) === 0).map(t => t.id);
});

const monthSpans = computed(() => {
  let spans = []; let cur = new Date(minDate.value); let curYM = "";
  for (let i = 0; i < totalDays.value; i++) {
    let ym = `${cur.getFullYear()}年${String(cur.getMonth()+1).padStart(2,'0')}月`;
    if (ym !== curYM) { spans.push({ ym, count: 1 }); curYM = ym; }
    else { spans[spans.length - 1].count++; }
    cur.setDate(cur.getDate() + 1);
  }
  return spans;
});

const daysList = computed(() => {
  let list = []; let cur = new Date(minDate.value);
  for (let i = 0; i < totalDays.value; i++) {
    list.push({ dateNum: cur.getDate(), isWeekend: cur.getDay() === 0 || cur.getDay() === 6 });
    cur.setDate(cur.getDate() + 1);
  }
  return list;
});

const weekendIndexes = computed(() => {
  let idxs = []; let cur = new Date(minDate.value);
  for (let i = 0; i < totalDays.value; i++) {
    if (cur.getDay() % 6 === 0) idxs.push(i);
    cur.setDate(cur.getDate() + 1);
  }
  return idxs;
});

function getOrigBarPos(task) {
  const s = new Date(task.start); const e = new Date(task.end);
  return { left: Math.max(0, Math.round((s - minDate.value)/(1000*60*60*24))*34), width: Math.max(0, (Math.round((e - s)/(1000*60*60*24))+1)*34) };
}

function getBaselinePos(task) {
  const s = new Date(task.baselineStart); const e = new Date(task.baselineEnd);
  return { left: Math.max(0, Math.round((s - minDate.value)/(1000*60*60*24))*34), width: Math.max(0, (Math.round((e - s)/(1000*60*60*24))+1)*34) };
}

function getDynamicBarPos(task) {
  let sStr = task.start; let eStr = task.end;
  if (activeDrag.value && activeDrag.value.taskId === task.id) {
    sStr = activeDrag.value.tempStart; eStr = activeDrag.value.tempEnd;
  }
  const s = new Date(sStr); const e = new Date(eStr);
  return { left: Math.max(0, Math.round((s - minDate.value)/(1000*60*60*24))*34), width: Math.max(0, (Math.round((e - s)/(1000*60*60*24))+1)*34) };
}

function getStageColor(stageName) {
  return store.appData.stageList.find(s => s.name === stageName)?.color || '#666';
}

function getStatusClass(status) {
  if (status === '已完成') return 'status-done';
  if (status === '進行中') return 'status-doing';
  if (status === '未開始') return 'status-notstart';
  return '';
}

function getPreviewText(task) {
  let chkStr = (task.checklists?.length > 0) ? ` [✅${task.checklists.filter(c=>c.isDone).length}/${task.checklists.length}]` : '';
  if (activeDrag.value && activeDrag.value.taskId === task.id) return `[${activeDrag.value.tempStart} ~ ${activeDrag.value.tempEnd}] ${task.content}${chkStr}`;
  return `${task.content} - ${task.status}${chkStr}`;
}

function handleHover(e) {
  if (activeDrag.value) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  if (mouseX >= labelWidth.value) hoverIndex.value = Math.floor((mouseX - labelWidth.value) / 34);
  else hoverIndex.value = -1;
}

function startDrag(e, task, type) {
  if (store.isReadOnlyMode) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  activeDrag.value = { taskId: task.id, type, startX: clientX, origStart: task.start, origEnd: task.end, tempStart: task.start, tempEnd: task.end, moved: false };

  const onMove = (me) => {
    if (!activeDrag.value) return;
    const curX = me.touches ? me.touches[0].clientX : me.clientX;
    const deltaX = curX - activeDrag.value.startX;
    if (Math.abs(deltaX) > 3) activeDrag.value.moved = true;
    const daysDelta = Math.round(deltaX / 34);

    let dStart = new Date(activeDrag.value.origStart);
    let dEnd = new Date(activeDrag.value.origEnd);

    if (type === 'move') {
      dStart.setDate(dStart.getDate() + daysDelta);
      dEnd.setDate(dEnd.getDate() + daysDelta);
    } else if (type === 'resize-left') {
      dStart.setDate(dStart.getDate() + daysDelta);
      if (dStart > dEnd) dStart = new Date(dEnd);
    } else if (type === 'resize-right') {
      dEnd.setDate(dEnd.getDate() + daysDelta);
      if (dEnd < dStart) dEnd = new Date(dStart);
    }

    activeDrag.value.tempStart = formatDate(dStart);
    activeDrag.value.tempEnd = formatDate(dEnd);
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
    if (activeDrag.value) {
      if (!activeDrag.value.moved) emit('edit-task', task.id);
      else {
        store.saveStateSnapshot();
        task.start = activeDrag.value.tempStart;
        task.end = activeDrag.value.tempEnd;
        store.propagateTaskDates(tasks.value);
      }
      activeDrag.value = null;
    }
  };

  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp);
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
</script>
