// ===============================
// 🔐 Admin Access Guard (Firebase)
// ===============================
import { db } from "./firebase.js";
import {
  doc, getDoc,
  collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

async function checkAdminAccess() {
  const email = localStorage.getItem("kb_user_email");

  if (!email) {
    window.location.href = "login.html";
    return false;
  }

  try {
    const snap = await getDoc(doc(db, "users", email));
    if (!snap.exists() || snap.data().role !== "admin") {
      document.getElementById("taskPageContent").style.display = "none";
      document.getElementById("unauthorizedBox").style.display = "block";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Permission check error:", err);
    showInfo("⚠️ خطأ", "حدث خطأ في التحقق من الصلاحيات. حاول مرة أخرى.");
    return false;
  }
}

// ===============================
// ✅ Settings (Logo for Print/PDF)
// ===============================
const REPORT_LOGO_URL = "assets/logo.png";
const REPORT_TITLE = "Employee Performance Report";

// ===============================
// ✅ Firestore Collection
// ===============================
const TASKS_COL = "tasks";
let unsubTasks = null;

// ===============================
// In-memory cache
// ===============================
let tasks = [];

// ===============================
// Board elements
// ===============================
const colInProgress = document.getElementById("colInProgress");
const colDone = document.getElementById("colDone");
const countInProgress = document.getElementById("countInProgress");
const countDone = document.getElementById("countDone");

// Top buttons
const openCreateBtn = document.getElementById("openCreateBtn");
const openReportBtn = document.getElementById("openReportBtn");

// ===============================
// Modals - Create
// ===============================
const createOverlay = document.getElementById("createOverlay");
const createCloseX = document.getElementById("createCloseX");
const createCancelBtn = document.getElementById("createCancelBtn");
const createSaveBtn = document.getElementById("createSaveBtn");

const cEmpName = document.getElementById("cEmpName");
const cEmpId = document.getElementById("cEmpId");
const cTaskName = document.getElementById("cTaskName");
const cTargetValue = document.getElementById("cTargetValue");
const cCurrentValue = document.getElementById("cCurrentValue");
const cDeadline = document.getElementById("cDeadline");
const cProgressValue = document.getElementById("cProgressValue");
const cProgressFill = document.getElementById("cProgressFill");
const cProgressLabel = document.getElementById("cProgressLabel");

// ===============================
// Modals - Update
// ===============================
const updateOverlay = document.getElementById("updateOverlay");
const updateCloseX = document.getElementById("updateCloseX");
const updateCancelBtn = document.getElementById("updateCancelBtn");
const updateSaveBtn = document.getElementById("updateSaveBtn");

const uTaskId = document.getElementById("uTaskId");
const uEmpName = document.getElementById("uEmpName");
const uEmpId = document.getElementById("uEmpId");
const uTaskName = document.getElementById("uTaskName");
const uTargetValue = document.getElementById("uTargetValue");
const uCurrentValue = document.getElementById("uCurrentValue");
const uDeadline = document.getElementById("uDeadline");
const uProgressValue = document.getElementById("uProgressValue");
const uProgressFill = document.getElementById("uProgressFill");
const uProgressLabel = document.getElementById("uProgressLabel");

// ===============================
// Modals - Confirm Delete
// ===============================
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmCloseX = document.getElementById("confirmCloseX");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const confirmInfo = document.getElementById("confirmInfo");
const confirmTaskId = document.getElementById("confirmTaskId");

// ===============================
// Modal - Feedback / Status
// ===============================
const fbOverlay = document.getElementById("feedbackOverlay");
const fbBox = document.getElementById("fbBox");
const fbTitle = document.getElementById("fbTitle");
const fbMessage = document.getElementById("fbMessage");
const fbTaskName = document.getElementById("fbTaskName");
const fbEmpName = document.getElementById("fbEmpName");
const fbEmpId = document.getElementById("fbEmpId");
const fbPercent = document.getElementById("fbPercent");
const fbDeadline = document.getElementById("fbDeadline");
const fbCloseBtn = document.getElementById("fbCloseBtn");

// ===============================
// Modal - Report
// ===============================
const reportOverlay = document.getElementById("reportOverlay");
const reportCloseX = document.getElementById("reportCloseX");
const reportCloseBtn = document.getElementById("reportCloseBtn");
const runReportBtn = document.getElementById("runReportBtn");
const clearReportBtn = document.getElementById("clearReportBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");

const rEmpName = document.getElementById("rEmpName");
const rEmpId = document.getElementById("rEmpId");
const reportResult = document.getElementById("reportResult");

// ===============================
// Helpers
// ===============================
function openModal(overlay) { overlay.classList.add("active"); }
function closeModal(overlay) { overlay.classList.remove("active"); }

function clampPercent(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}
function computePercent(current, target) {
  const t = Number(target);
  const c = Number(current);
  if (!t || t <= 0) return 0;
  return clampPercent((c / t) * 100);
}

function formatDateTime(d) {
  try {
    return new Date(d).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function progressClass(percent) {
  if (percent < 40) return "progress-low";
  if (percent < 70) return "progress-mid";
  return "progress-high";
}

function statusBadge(task) {
  if (task.status === "done") return { cls: "badge-done", text: "مكتمل" };
  if (task.status === "failed") return { cls: "badge-failed", text: "فشل" };
  return { cls: "badge-progress", text: "قيد التنفيذ" };
}

// ===============================
// Countdown helpers
// ===============================
function formatRemaining(ms) {
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "⛔ الوقت انتهى";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const dd = d > 0 ? `${d}ي ` : "";
  return `⏳ ${dd}${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateCountdownLabels() {
  const now = Date.now();
  document.querySelectorAll(".remaining-time[data-deadline]").forEach(el => {
    const deadline = el.getAttribute("data-deadline");
    if (!deadline) return;
    const ms = new Date(deadline).getTime() - now;
    el.textContent = formatRemaining(ms);
  });
}

// History helpers
function ensureHistory(task) {
  if (!task.history || !Array.isArray(task.history)) task.history = [];
  if (typeof task.lastBeforeCurrent === "undefined") task.lastBeforeCurrent = task.current ?? 0;
  if (typeof task.lastAfterCurrent === "undefined") task.lastAfterCurrent = task.current ?? 0;
  if (typeof task.lastBeforePercent === "undefined") task.lastBeforePercent = task.percent ?? 0;
  if (typeof task.lastAfterPercent === "undefined") task.lastAfterPercent = task.percent ?? 0;
}

// ===============================
// Feedback modal
// ===============================
function showInfo(title, message, mode = "info") {
  fbTitle.textContent = title;
  fbMessage.textContent = message;

  fbTaskName.textContent = "";
  fbEmpName.textContent = "";
  fbEmpId.textContent = "";
  fbPercent.textContent = "";
  fbDeadline.textContent = "";

  fbBox.style.border = "none";
  if (mode === "success") fbTitle.style.color = "#16a34a";
  else if (mode === "danger") fbTitle.style.color = "#b91c1c";
  else fbTitle.style.color = "#0f172a";

  openModal(fbOverlay);
}
// ===============================
// Live Preview progress
// ===============================
function calcCreatePreview() {
  const p = computePercent(cCurrentValue.value, cTargetValue.value);
  cProgressValue.value = p;
  cProgressFill.style.width = p + "%";
  cProgressFill.className = "progress-fill " + progressClass(p);
  cProgressLabel.textContent = p + "%";
}
cCurrentValue.addEventListener("input", calcCreatePreview);
cTargetValue.addEventListener("input", calcCreatePreview);

function calcUpdatePreview() {
  const p = computePercent(uCurrentValue.value, uTargetValue.value);
  uProgressValue.value = p;
  uProgressFill.style.width = p + "%";
  uProgressFill.className = "progress-fill " + progressClass(p);
  uProgressLabel.textContent = p + "%";
}
uCurrentValue.addEventListener("input", calcUpdatePreview);
uTargetValue.addEventListener("input", calcUpdatePreview);

// ===============================
// Status Logic (Auto)
// ===============================
function updateTaskStatusesLocal(list) {
  const now = new Date();
  list.forEach(task => {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    if ((task.percent ?? 0) >= 100) task.status = "done";
    else if (deadline && now > deadline) task.status = "failed";
    else task.status = "in-progress";
  });
}

// ===============================
// Firestore: subscribe tasks (Realtime)
// ===============================
function subscribeTasks() {
  if (unsubTasks) unsubTasks();

  const qy = query(collection(db, TASKS_COL), orderBy("createdAt", "desc"));

  unsubTasks = onSnapshot(qy, (snap) => {
    const list = [];
    snap.forEach(d => {
      const data = d.data() || {};
      list.push({
        id: d.id,
        ...data,
        // normalize
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ""),
        deadline: data.deadline?.toDate ? data.deadline.toDate().toISOString() : (data.deadline || "")
      });
    });

    // compute percent/status if missing (safe)
    list.forEach(t => {
      if (typeof t.percent === "undefined") t.percent = computePercent(t.current || 0, t.target || 0);
      ensureHistory(t);
    });
    updateTaskStatusesLocal(list);

    tasks = list;
    renderBoard();          // يرندر من tasks
    updateCountdownLabels();
  }, (err) => {
    console.error("Tasks subscribe error:", err);
    showInfo("⚠️ خطأ", "تعذر تحميل التاسكات من Firebase. تحقق من الصلاحيات.", "danger");
  });
}

// ===============================
// Create Task (Firestore)
// ===============================
function resetCreateModal() {
  cEmpName.value = "";
  cEmpId.value = "";
  cTaskName.value = "";
  cTargetValue.value = "";
  cCurrentValue.value = "";
  cDeadline.value = "";
  cProgressValue.value = "";
  cProgressFill.style.width = "0%";
  cProgressFill.className = "progress-fill";
  cProgressLabel.textContent = "0%";
}

async function createTaskFromModal() {
  const employee = (cEmpName.value || "").trim();
  const employeeId = (cEmpId.value || "").trim();
  const name = (cTaskName.value || "").trim();
  const target = Number(cTargetValue.value);
  const current = Number(cCurrentValue.value || 0);
  const deadlineValue = cDeadline.value;

  if (!employee || !name || !target || target <= 0 || !deadlineValue) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال (اسم الموظف + KPI + الهدف + الموعد النهائي) بشكل صحيح.");
    return;
  }

  const percent = computePercent(current, target);

  const payload = {
    name,
    employee,
    employeeId,
    target,
    current,
    percent,
    deadline: new Date(deadlineValue),
    status: percent >= 100 ? "done" : "in-progress",
    createdAt: serverTimestamp(),

    history: [],
    lastBeforeCurrent: current,
    lastAfterCurrent: current,
    lastBeforePercent: percent,
    lastAfterPercent: percent
  };

  try {
    await addDoc(collection(db, TASKS_COL), payload);
    closeModal(createOverlay);
    resetCreateModal();
    showInfo("✅ تم الإنشاء", "تم إنشاء التاسك بنجاح (Firebase).", "success");
  } catch (err) {
    console.error("Create task error:", err);
    showInfo("⚠️ خطأ", "فشل إنشاء التاسك. تحقق من صلاحيات Firestore.", "danger");
  }
}

openCreateBtn.onclick = () => { resetCreateModal(); openModal(createOverlay); };
createCloseX.onclick = () => closeModal(createOverlay);
createCancelBtn.onclick = () => closeModal(createOverlay);
createSaveBtn.onclick = createTaskFromModal;
// ===============================
// Update Task (Firestore)
// ===============================
function openUpdateModal(task) {
  uTaskId.value = task.id;
  uEmpName.value = task.employee || "";
  uEmpId.value = task.employeeId || "";
  uTaskName.value = task.name || "";
  uTargetValue.value = task.target ?? "";
  uCurrentValue.value = task.current ?? "";
  uDeadline.value = toDatetimeLocalValue(task.deadline);
  calcUpdatePreview();
  openModal(updateOverlay);
}

async function saveUpdateModal() {
  const id = uTaskId.value;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  ensureHistory(task);

  const employee = (uEmpName.value || "").trim();
  const employeeId = (uEmpId.value || "").trim();
  const name = (uTaskName.value || "").trim();
  const target = Number(uTargetValue.value);
  const current = Number(uCurrentValue.value || 0);
  const deadlineValue = uDeadline.value;

  if (!employee || !name || !target || target <= 0 || !deadlineValue) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال (اسم الموظف + KPI + الهدف + الموعد النهائي) بشكل صحيح.");
    return;
  }

  const beforeCurrent = Number(task.current || 0);
  const beforePercent = Number(task.percent || 0);
  const newPercent = computePercent(current, target);

  const nextHistory = Array.isArray(task.history) ? [...task.history] : [];
  nextHistory.push({
    at: new Date().toISOString(),
    type: "edit",
    beforeCurrent,
    afterCurrent: current,
    beforePercent,
    afterPercent: newPercent,
    delta: current - beforeCurrent
  });

  const payload = {
    employee,
    employeeId,
    name,
    target,
    current,
    percent: newPercent,
    deadline: new Date(deadlineValue),
    status: newPercent >= 100 ? "done" : (new Date() > new Date(deadlineValue) ? "failed" : "in-progress"),

    history: nextHistory,
    lastBeforeCurrent: beforeCurrent,
    lastAfterCurrent: current,
    lastBeforePercent: beforePercent,
    lastAfterPercent: newPercent
  };

  try {
    await updateDoc(doc(db, TASKS_COL, id), payload);
    closeModal(updateOverlay);
    showInfo("✅ تم الحفظ", "تم حفظ التعديل بنجاح (Firebase).", "success");
  } catch (err) {
    console.error("Update task error:", err);
    showInfo("⚠️ خطأ", "فشل حفظ التعديل. تحقق من صلاحيات Firestore.", "danger");
  }
}

updateCloseX.onclick = () => closeModal(updateOverlay);
updateCancelBtn.onclick = () => closeModal(updateOverlay);
updateSaveBtn.onclick = saveUpdateModal;

// ===============================
// Incremental Progress Update (Firestore)
// ===============================
async function incrementalUpdate(task) {
  ensureHistory(task);

  if (task.status === "done") {
    showInfo("ℹ️ تنبيه", "هذه المهمة مكتملة بالفعل (100%).");
    return;
  }

  const incStr = prompt("أدخل مقدار الإنجاز الجديد (سيتم جمعه مع الحالي):", "1");
  if (incStr === null) return;

  const inc = Number(incStr);
  if (!Number.isFinite(inc) || inc <= 0) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال رقم صحيح أكبر من 0.");
    return;
  }

  const beforeCurrent = Number(task.current || 0);
  const beforePercent = Number(task.percent || 0);

  const newCurrent = beforeCurrent + inc;
  const newPercent = computePercent(newCurrent, task.target);

  const nextHistory = Array.isArray(task.history) ? [...task.history] : [];
  nextHistory.push({
    at: new Date().toISOString(),
    type: "increment",
    beforeCurrent,
    afterCurrent: newCurrent,
    beforePercent,
    afterPercent: newPercent,
    delta: inc
  });

  const payload = {
    current: newCurrent,
    percent: newPercent,
    status: newPercent >= 100 ? "done" : (task.deadline && new Date() > new Date(task.deadline) ? "failed" : "in-progress"),
    history: nextHistory,
    lastBeforeCurrent: beforeCurrent,
    lastAfterCurrent: newCurrent,
    lastBeforePercent: beforePercent,
    lastAfterPercent: newPercent
  };

  try {
    await updateDoc(doc(db, TASKS_COL, task.id), payload);
    showInfo("✅ تم التحديث", `تمت إضافة +${inc} إلى القيمة الحالية (Firebase).`, "success");
  } catch (err) {
    console.error("Increment error:", err);
    showInfo("⚠️ خطأ", "فشل تحديث القيمة. تحقق من صلاحيات Firestore.", "danger");
  }
}

// ===============================
// Delete Task (Firestore)
// ===============================
function openDeleteConfirm(task) {
  confirmTaskId.value = task.id;
  confirmInfo.innerHTML = `
    <div><strong>المهمة:</strong> ${task.name}</div>
    <div><strong>الموظف:</strong> ${task.employee} ${task.employeeId ? `(ID: ${task.employeeId})` : ""}</div>
    <div><strong>الإنجاز:</strong> ${task.percent ?? 0}%</div>
  `;
  openModal(confirmOverlay);
}

async function confirmDelete() {
  const id = confirmTaskId.value;

  try {
    await deleteDoc(doc(db, TASKS_COL, id));
    closeModal(confirmOverlay);
    showInfo("🗑️ تم الحذف", "تم حذف التاسك بنجاح (Firebase).", "success");
  } catch (err) {
    console.error("Delete error:", err);
    showInfo("⚠️ خطأ", "فشل حذف التاسك. تحقق من صلاحيات Firestore.", "danger");
  }
}

confirmCloseX.onclick = () => closeModal(confirmOverlay);
confirmCancelBtn.onclick = () => closeModal(confirmOverlay);
confirmDeleteBtn.onclick = confirmDelete;

// ===============================
// Card click: Status Feedback Popup
// ===============================
function showTaskFeedback(task) {
  if (task.status === "done") {
    fbTitle.textContent = "🎉 مكتمل";
    fbMessage.textContent = "تم إكمال المهمة بنجاح.";
    fbTitle.style.color = "#16a34a";
  } else if (task.status === "failed") {
    fbTitle.textContent = "❌ متأخر";
    fbMessage.textContent = "انتهى الوقت ولم يتم إكمال المهمة.";
    fbTitle.style.color = "#b91c1c";
  } else {
    fbTitle.textContent = "⌛ قيد التنفيذ";
    fbMessage.textContent = "المهمة ما زالت قيد العمل.";
    fbTitle.style.color = "#0f172a";
  }

  fbTaskName.textContent = task.name || "—";
  fbEmpName.textContent = task.employee || "—";
  fbEmpId.textContent = task.employeeId || "—";
  fbPercent.textContent = String(task.percent ?? 0);
  fbDeadline.textContent = formatDateTime(task.deadline);

  openModal(fbOverlay);
}
fbCloseBtn.onclick = () => closeModal(fbOverlay);

// ===============================
// Render Board (uses in-memory tasks)
// ===============================
function renderBoard() {
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  let inProg = 0, done = 0;

  // tasks already sorted by snapshot orderBy createdAt desc
  tasks.forEach(task => {
    ensureHistory(task);

    // ensure status
    const deadline = task.deadline ? new Date(task.deadline) : null;
    if ((task.percent ?? 0) >= 100) task.status = "done";
    else if (deadline && new Date() > deadline) task.status = "failed";
    else task.status = "in-progress";

    const badge = statusBadge(task);
    const pClass = progressClass(task.percent ?? 0);

    const card = document.createElement("div");
    card.className = "task-card";
    if (task.status === "done") card.classList.add("done");
    if (task.status === "failed") card.classList.add("failed");

    card.innerHTML = `
      <div class="task-title">${task.name}</div>

      <div class="task-meta">
        <span class="label">👤</span>
        <span>${task.employee}</span>
        ${task.employeeId ? `<span class="label">🆔</span><span>${task.employeeId}</span>` : ""}
      </div>

      <div class="task-row">
        <div class="task-meta">
          <span class="label">🎯 الهدف:</span><span>${task.target}</span>
        </div>
        <div class="task-meta">
          <span class="label">📊 الحالي:</span><span>${task.current}</span>
        </div>
      </div>

      <div class="task-row">
        <div class="task-meta">
          <span class="label">⏰ الموعد:</span><span>${formatDateTime(task.deadline)}</span>
        </div>
        <div class="badge ${badge.cls}">${badge.text}</div>
      </div>

      <div class="card-progress">
        <div class="progress">
          <div class="progress-fill ${pClass}" style="width:${task.percent ?? 0}%"></div>
        </div>
        <div class="task-row" style="margin-top:6px;">
          <div class="remaining-time" data-deadline="${task.deadline || ""}">
            ${task.status === "failed" ? "⛔ الوقت انتهى" : ""}
          </div>
          <div class="progress-label">${task.percent ?? 0}%</div>
        </div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnUpdate = document.createElement("button");
    btnUpdate.className = "btn-small btn-update";
    btnUpdate.textContent = "تحديث";
    btnUpdate.onclick = (e) => { e.stopPropagation(); incrementalUpdate(task); };

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-small btn-update";
    btnEdit.textContent = "تعديل";
    btnEdit.onclick = (e) => { e.stopPropagation(); openUpdateModal(task); };

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-small btn-delete";
    btnDelete.textContent = "حذف";
    btnDelete.onclick = (e) => { e.stopPropagation(); openDeleteConfirm(task); };

    actions.append(btnUpdate, btnEdit, btnDelete);
    card.appendChild(actions);

    card.onclick = () => showTaskFeedback(task);

    if (task.status === "done") { colDone.appendChild(card); done++; }
    else { colInProgress.appendChild(card); inProg++; }
  });

  countInProgress.textContent = inProg;
  countDone.textContent = done;

  updateCountdownLabels();
}

// ===============================
// Report (كما هو + Excel)
// ===============================
function renderReportSummary(list, employeeLabel) {
  const total = list.length;
  const doneCount = list.filter(t => t.status === "done").length;
  const notDoneCount = total - doneCount;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const allHistory = [];
  list.forEach(t => {
    ensureHistory(t);
    if (t.history && t.history.length) {
      const last = t.history[t.history.length - 1];
      allHistory.push({ task: t, last });
    }
  });
  allHistory.sort((a,b) => (b.last.at || "").localeCompare(a.last.at || ""));
  const latest = allHistory[0];

  const beforeAfterHtml = latest ? `
    <div style="margin-top:14px; padding:12px; border:1px solid #e6edf7; border-radius:14px; background:#fbfdff;">
      <div style="font-weight:800; margin-bottom:8px;">📌 Before / After (آخر تحديث)</div>
      <div style="font-size:13px; color:#111827; line-height:1.9;">
        <div><strong>المهمة:</strong> ${latest.task.name}</div>
        <div><strong>النوع:</strong> ${latest.last.type === "increment" ? "تحديث (Increment)" : "تعديل (Edit)"}</div>
        <div><strong>قبل:</strong> Current=${latest.last.beforeCurrent} | ${latest.last.beforePercent}%</div>
        <div><strong>بعد:</strong> Current=${latest.last.afterCurrent} | ${latest.last.afterPercent}%</div>
        <div><strong>الفرق:</strong> +${latest.last.delta}</div>
        <div><strong>وقت التحديث:</strong> ${formatDateTime(latest.last.at)}</div>
      </div>
    </div>
  ` : `<div style="margin-top:14px; color:#6b7280; font-size:13px;">لا توجد تحديثات Before/After لهذا الموظف بعد.</div>`;

  reportResult.innerHTML = `
    <div id="printArea">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${REPORT_LOGO_URL}" alt="logo" style="height:44px; width:auto; object-fit:contain;" onerror="this.style.display='none'">
          <div>
            <div style="font-weight:900; font-size:16px;">${REPORT_TITLE}</div>
            <div style="font-size:12px; color:#6b7280;">${formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>
        <div class="badge ${percent >= 70 ? "badge-done" : percent >= 40 ? "badge-progress" : "badge-failed"}">
          نسبة الإنجاز: ${percent}%
        </div>
      </div>

      <div class="report-cards">
        <div class="report-card"><h4>الموظف</h4><div class="val">${employeeLabel}</div></div>
        <div class="report-card"><h4>إجمالي التاسكات</h4><div class="val">${total}</div></div>
        <div class="report-card"><h4>المكتمل</h4><div class="val">${doneCount}</div></div>
        <div class="report-card"><h4>غير مكتمل</h4><div class="val">${notDoneCount}</div></div>
      </div>

      ${beforeAfterHtml}
    </div>

    <div style="margin-top:12px; display:flex; gap:10px; align-items:center; justify-content:flex-start;">
      <button id="printReportBtn" class="btn-primary">🖨️ طباعة / PDF</button>
      <div style="color:#6b7280; font-size:12px;">(من نافذة الطباعة اختر “Save as PDF”)</div>
    </div>
  `;

  const btn = document.getElementById("printReportBtn");
  if (btn) btn.onclick = () => window.print();
}

function runReport() {
  const name = (rEmpName.value || "").trim().toLowerCase();
  const id = (rEmpId.value || "").trim().toLowerCase();

  if (!name && !id) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال اسم الموظف أو Employee ID لعرض التقرير.");
    return;
  }

  const list = tasks.filter(t => {
    const tName = (t.employee || "").toLowerCase();
    const tId = (t.employeeId || "").toLowerCase();
    const okName = name ? tName.includes(name) : true;
    const okId = id ? tId === id : true;
    return okName && okId;
  });

  if (!list.length) {
    reportResult.innerHTML = `<div class="report-empty">لا توجد بيانات لهذا الموظف.</div>`;
    return;
  }

  const label = `${name ? rEmpName.value.trim() : "—"}${id ? ` (ID: ${rEmpId.value.trim()})` : ""}`;
  renderReportSummary(list, label);
}

function clearReport() {
  rEmpName.value = "";
  rEmpId.value = "";
  reportResult.innerHTML = `<div class="report-empty">اختر موظف لعرض التقرير</div>`;
}

openReportBtn.onclick = () => { clearReport(); openModal(reportOverlay); };
reportCloseX.onclick = () => closeModal(reportOverlay);
reportCloseBtn.onclick = () => closeModal(reportOverlay);
runReportBtn.onclick = runReport;
clearReportBtn.onclick = clearReport;

// ✅ Excel Export (Fix زر Excel)
function exportReportToExcel() {
  if (typeof XLSX === "undefined") {
    showInfo("⚠️ تنبيه", "مكتبة Excel غير محملة.");
    return;
  }

  const name = (rEmpName.value || "").trim().toLowerCase();
  const id = (rEmpId.value || "").trim().toLowerCase();

  if (!name && !id) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال اسم الموظف أو Employee ID قبل التصدير.");
    return;
  }

  const list = tasks.filter(t => {
    const tName = (t.employee || "").toLowerCase();
    const tId = (t.employeeId || "").toLowerCase();
    const okName = name ? tName.includes(name) : true;
    const okId = id ? tId === id : true;
    return okName && okId;
  });

  if (!list.length) {
    showInfo("⚠️ تنبيه", "لا توجد بيانات لهذا الموظف لتصديرها.");
    return;
  }

  const data = list.map((t, i) => ({
    "#": i + 1,
    "اسم الموظف": t.employee,
    "Employee ID": t.employeeId || "",
    "المهمة (KPI)": t.name,
    "الهدف": t.target,
    "الحالي": t.current,
    "نسبة الإنجاز %": t.percent,
    "الحالة": t.status === "done" ? "مكتمل" : t.status === "failed" ? "فشل" : "قيد التنفيذ",
    "الموعد النهائي": formatDateTime(t.deadline)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employee Tasks");

  const fileName = `Employee_Report_${rEmpName.value || "Employee"}_${rEmpId.value || ""}.xlsx`;
  XLSX.writeFile(wb, fileName);

  showInfo("✅ تم التصدير", "تم تنزيل تقرير Excel بنجاح.", "success");
}

if (exportExcelBtn) exportExcelBtn.onclick = exportReportToExcel;

// ===============================
// Init
// ===============================
let countdownTimer = null;

async function initTasksPage() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;

  // realtime from Firestore
  subscribeTasks();

  // countdown live
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => updateCountdownLabels(), 1000);
}

initTasksPage();
// ===============================
// Update Task (Firestore)
// ===============================
function openUpdateModal(task) {
  uTaskId.value = task.id;
  uEmpName.value = task.employee || "";
  uEmpId.value = task.employeeId || "";
  uTaskName.value = task.name || "";
  uTargetValue.value = task.target ?? "";
  uCurrentValue.value = task.current ?? "";
  uDeadline.value = toDatetimeLocalValue(task.deadline);
  calcUpdatePreview();
  openModal(updateOverlay);
}

async function saveUpdateModal() {
  const id = uTaskId.value;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  ensureHistory(task);

  const employee = (uEmpName.value || "").trim();
  const employeeId = (uEmpId.value || "").trim();
  const name = (uTaskName.value || "").trim();
  const target = Number(uTargetValue.value);
  const current = Number(uCurrentValue.value || 0);
  const deadlineValue = uDeadline.value;

  if (!employee || !name || !target || target <= 0 || !deadlineValue) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال (اسم الموظف + KPI + الهدف + الموعد النهائي) بشكل صحيح.");
    return;
  }

  const beforeCurrent = Number(task.current || 0);
  const beforePercent = Number(task.percent || 0);
  const newPercent = computePercent(current, target);

  const nextHistory = Array.isArray(task.history) ? [...task.history] : [];
  nextHistory.push({
    at: new Date().toISOString(),
    type: "edit",
    beforeCurrent,
    afterCurrent: current,
    beforePercent,
    afterPercent: newPercent,
    delta: current - beforeCurrent
  });

  const payload = {
    employee,
    employeeId,
    name,
    target,
    current,
    percent: newPercent,
    deadline: new Date(deadlineValue),
    status: newPercent >= 100 ? "done" : (new Date() > new Date(deadlineValue) ? "failed" : "in-progress"),

    history: nextHistory,
    lastBeforeCurrent: beforeCurrent,
    lastAfterCurrent: current,
    lastBeforePercent: beforePercent,
    lastAfterPercent: newPercent
  };

  try {
    await updateDoc(doc(db, TASKS_COL, id), payload);
    closeModal(updateOverlay);
    showInfo("✅ تم الحفظ", "تم حفظ التعديل بنجاح (Firebase).", "success");
  } catch (err) {
    console.error("Update task error:", err);
    showInfo("⚠️ خطأ", "فشل حفظ التعديل. تحقق من صلاحيات Firestore.", "danger");
  }
}

updateCloseX.onclick = () => closeModal(updateOverlay);
updateCancelBtn.onclick = () => closeModal(updateOverlay);
updateSaveBtn.onclick = saveUpdateModal;

// ===============================
// Incremental Progress Update (Firestore)
// ===============================
async function incrementalUpdate(task) {
  ensureHistory(task);

  if (task.status === "done") {
    showInfo("ℹ️ تنبيه", "هذه المهمة مكتملة بالفعل (100%).");
    return;
  }

  const incStr = prompt("أدخل مقدار الإنجاز الجديد (سيتم جمعه مع الحالي):", "1");
  if (incStr === null) return;

  const inc = Number(incStr);
  if (!Number.isFinite(inc) || inc <= 0) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال رقم صحيح أكبر من 0.");
    return;
  }

  const beforeCurrent = Number(task.current || 0);
  const beforePercent = Number(task.percent || 0);

  const newCurrent = beforeCurrent + inc;
  const newPercent = computePercent(newCurrent, task.target);

  const nextHistory = Array.isArray(task.history) ? [...task.history] : [];
  nextHistory.push({
    at: new Date().toISOString(),
    type: "increment",
    beforeCurrent,
    afterCurrent: newCurrent,
    beforePercent,
    afterPercent: newPercent,
    delta: inc
  });

  const payload = {
    current: newCurrent,
    percent: newPercent,
    status: newPercent >= 100 ? "done" : (task.deadline && new Date() > new Date(task.deadline) ? "failed" : "in-progress"),
    history: nextHistory,
    lastBeforeCurrent: beforeCurrent,
    lastAfterCurrent: newCurrent,
    lastBeforePercent: beforePercent,
    lastAfterPercent: newPercent
  };

  try {
    await updateDoc(doc(db, TASKS_COL, task.id), payload);
    showInfo("✅ تم التحديث", `تمت إضافة +${inc} إلى القيمة الحالية (Firebase).`, "success");
  } catch (err) {
    console.error("Increment error:", err);
    showInfo("⚠️ خطأ", "فشل تحديث القيمة. تحقق من صلاحيات Firestore.", "danger");
  }
}

// ===============================
// Delete Task (Firestore)
// ===============================
function openDeleteConfirm(task) {
  confirmTaskId.value = task.id;
  confirmInfo.innerHTML = `
    <div><strong>المهمة:</strong> ${task.name}</div>
    <div><strong>الموظف:</strong> ${task.employee} ${task.employeeId ? `(ID: ${task.employeeId})` : ""}</div>
    <div><strong>الإنجاز:</strong> ${task.percent ?? 0}%</div>
  `;
  openModal(confirmOverlay);
}

async function confirmDelete() {
  const id = confirmTaskId.value;

  try {
    await deleteDoc(doc(db, TASKS_COL, id));
    closeModal(confirmOverlay);
    showInfo("🗑️ تم الحذف", "تم حذف التاسك بنجاح (Firebase).", "success");
  } catch (err) {
    console.error("Delete error:", err);
    showInfo("⚠️ خطأ", "فشل حذف التاسك. تحقق من صلاحيات Firestore.", "danger");
  }
}

confirmCloseX.onclick = () => closeModal(confirmOverlay);
confirmCancelBtn.onclick = () => closeModal(confirmOverlay);
confirmDeleteBtn.onclick = confirmDelete;

// ===============================
// Card click: Status Feedback Popup
// ===============================
function showTaskFeedback(task) {
  if (task.status === "done") {
    fbTitle.textContent = "🎉 مكتمل";
    fbMessage.textContent = "تم إكمال المهمة بنجاح.";
    fbTitle.style.color = "#16a34a";
  } else if (task.status === "failed") {
    fbTitle.textContent = "❌ متأخر";
    fbMessage.textContent = "انتهى الوقت ولم يتم إكمال المهمة.";
    fbTitle.style.color = "#b91c1c";
  } else {
    fbTitle.textContent = "⌛ قيد التنفيذ";
    fbMessage.textContent = "المهمة ما زالت قيد العمل.";
    fbTitle.style.color = "#0f172a";
  }

  fbTaskName.textContent = task.name || "—";
  fbEmpName.textContent = task.employee || "—";
  fbEmpId.textContent = task.employeeId || "—";
  fbPercent.textContent = String(task.percent ?? 0);
  fbDeadline.textContent = formatDateTime(task.deadline);

  openModal(fbOverlay);
}
fbCloseBtn.onclick = () => closeModal(fbOverlay);

// ===============================
// Render Board (uses in-memory tasks)
// ===============================
function renderBoard() {
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  let inProg = 0, done = 0;

  // tasks already sorted by snapshot orderBy createdAt desc
  tasks.forEach(task => {
    ensureHistory(task);

    // ensure status
    const deadline = task.deadline ? new Date(task.deadline) : null;
    if ((task.percent ?? 0) >= 100) task.status = "done";
    else if (deadline && new Date() > deadline) task.status = "failed";
    else task.status = "in-progress";

    const badge = statusBadge(task);
    const pClass = progressClass(task.percent ?? 0);

    const card = document.createElement("div");
    card.className = "task-card";
    if (task.status === "done") card.classList.add("done");
    if (task.status === "failed") card.classList.add("failed");

    card.innerHTML = `
      <div class="task-title">${task.name}</div>

      <div class="task-meta">
        <span class="label">👤</span>
        <span>${task.employee}</span>
        ${task.employeeId ? `<span class="label">🆔</span><span>${task.employeeId}</span>` : ""}
      </div>

      <div class="task-row">
        <div class="task-meta">
          <span class="label">🎯 الهدف:</span><span>${task.target}</span>
        </div>
        <div class="task-meta">
          <span class="label">📊 الحالي:</span><span>${task.current}</span>
        </div>
      </div>

      <div class="task-row">
        <div class="task-meta">
          <span class="label">⏰ الموعد:</span><span>${formatDateTime(task.deadline)}</span>
        </div>
        <div class="badge ${badge.cls}">${badge.text}</div>
      </div>

      <div class="card-progress">
        <div class="progress">
          <div class="progress-fill ${pClass}" style="width:${task.percent ?? 0}%"></div>
        </div>
        <div class="task-row" style="margin-top:6px;">
          <div class="remaining-time" data-deadline="${task.deadline || ""}">
            ${task.status === "failed" ? "⛔ الوقت انتهى" : ""}
          </div>
          <div class="progress-label">${task.percent ?? 0}%</div>
        </div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnUpdate = document.createElement("button");
    btnUpdate.className = "btn-small btn-update";
    btnUpdate.textContent = "تحديث";
    btnUpdate.onclick = (e) => { e.stopPropagation(); incrementalUpdate(task); };

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-small btn-update";
    btnEdit.textContent = "تعديل";
    btnEdit.onclick = (e) => { e.stopPropagation(); openUpdateModal(task); };

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-small btn-delete";
    btnDelete.textContent = "حذف";
    btnDelete.onclick = (e) => { e.stopPropagation(); openDeleteConfirm(task); };

    actions.append(btnUpdate, btnEdit, btnDelete);
    card.appendChild(actions);

    card.onclick = () => showTaskFeedback(task);

    if (task.status === "done") { colDone.appendChild(card); done++; }
    else { colInProgress.appendChild(card); inProg++; }
  });

  countInProgress.textContent = inProg;
  countDone.textContent = done;

  updateCountdownLabels();
}

// ===============================
// Report (كما هو + Excel)
// ===============================
function renderReportSummary(list, employeeLabel) {
  const total = list.length;
  const doneCount = list.filter(t => t.status === "done").length;
  const notDoneCount = total - doneCount;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const allHistory = [];
  list.forEach(t => {
    ensureHistory(t);
    if (t.history && t.history.length) {
      const last = t.history[t.history.length - 1];
      allHistory.push({ task: t, last });
    }
  });
  allHistory.sort((a,b) => (b.last.at || "").localeCompare(a.last.at || ""));
  const latest = allHistory[0];

  const beforeAfterHtml = latest ? `
    <div style="margin-top:14px; padding:12px; border:1px solid #e6edf7; border-radius:14px; background:#fbfdff;">
      <div style="font-weight:800; margin-bottom:8px;">📌 Before / After (آخر تحديث)</div>
      <div style="font-size:13px; color:#111827; line-height:1.9;">
        <div><strong>المهمة:</strong> ${latest.task.name}</div>
        <div><strong>النوع:</strong> ${latest.last.type === "increment" ? "تحديث (Increment)" : "تعديل (Edit)"}</div>
        <div><strong>قبل:</strong> Current=${latest.last.beforeCurrent} | ${latest.last.beforePercent}%</div>
        <div><strong>بعد:</strong> Current=${latest.last.afterCurrent} | ${latest.last.afterPercent}%</div>
        <div><strong>الفرق:</strong> +${latest.last.delta}</div>
        <div><strong>وقت التحديث:</strong> ${formatDateTime(latest.last.at)}</div>
      </div>
    </div>
  ` : `<div style="margin-top:14px; color:#6b7280; font-size:13px;">لا توجد تحديثات Before/After لهذا الموظف بعد.</div>`;

  reportResult.innerHTML = `
    <div id="printArea">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${REPORT_LOGO_URL}" alt="logo" style="height:44px; width:auto; object-fit:contain;" onerror="this.style.display='none'">
          <div>
            <div style="font-weight:900; font-size:16px;">${REPORT_TITLE}</div>
            <div style="font-size:12px; color:#6b7280;">${formatDateTime(new Date().toISOString())}</div>
          </div>
        </div>
        <div class="badge ${percent >= 70 ? "badge-done" : percent >= 40 ? "badge-progress" : "badge-failed"}">
          نسبة الإنجاز: ${percent}%
        </div>
      </div>

      <div class="report-cards">
        <div class="report-card"><h4>الموظف</h4><div class="val">${employeeLabel}</div></div>
        <div class="report-card"><h4>إجمالي التاسكات</h4><div class="val">${total}</div></div>
        <div class="report-card"><h4>المكتمل</h4><div class="val">${doneCount}</div></div>
        <div class="report-card"><h4>غير مكتمل</h4><div class="val">${notDoneCount}</div></div>
      </div>

      ${beforeAfterHtml}
    </div>

    <div style="margin-top:12px; display:flex; gap:10px; align-items:center; justify-content:flex-start;">
      <button id="printReportBtn" class="btn-primary">🖨️ طباعة / PDF</button>
      <div style="color:#6b7280; font-size:12px;">(من نافذة الطباعة اختر “Save as PDF”)</div>
    </div>
  `;

  const btn = document.getElementById("printReportBtn");
  if (btn) btn.onclick = () => window.print();
}

function runReport() {
  const name = (rEmpName.value || "").trim().toLowerCase();
  const id = (rEmpId.value || "").trim().toLowerCase();

  if (!name && !id) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال اسم الموظف أو Employee ID لعرض التقرير.");
    return;
  }

  const list = tasks.filter(t => {
    const tName = (t.employee || "").toLowerCase();
    const tId = (t.employeeId || "").toLowerCase();
    const okName = name ? tName.includes(name) : true;
    const okId = id ? tId === id : true;
    return okName && okId;
  });

  if (!list.length) {
    reportResult.innerHTML = `<div class="report-empty">لا توجد بيانات لهذا الموظف.</div>`;
    return;
  }

  const label = `${name ? rEmpName.value.trim() : "—"}${id ? ` (ID: ${rEmpId.value.trim()})` : ""}`;
  renderReportSummary(list, label);
}

function clearReport() {
  rEmpName.value = "";
  rEmpId.value = "";
  reportResult.innerHTML = `<div class="report-empty">اختر موظف لعرض التقرير</div>`;
}

openReportBtn.onclick = () => { clearReport(); openModal(reportOverlay); };
reportCloseX.onclick = () => closeModal(reportOverlay);
reportCloseBtn.onclick = () => closeModal(reportOverlay);
runReportBtn.onclick = runReport;
clearReportBtn.onclick = clearReport;

// ✅ Excel Export (Fix زر Excel)
function exportReportToExcel() {
  if (typeof XLSX === "undefined") {
    showInfo("⚠️ تنبيه", "مكتبة Excel غير محملة.");
    return;
  }

  const name = (rEmpName.value || "").trim().toLowerCase();
  const id = (rEmpId.value || "").trim().toLowerCase();

  if (!name && !id) {
    showInfo("⚠️ تنبيه", "الرجاء إدخال اسم الموظف أو Employee ID قبل التصدير.");
    return;
  }

  const list = tasks.filter(t => {
    const tName = (t.employee || "").toLowerCase();
    const tId = (t.employeeId || "").toLowerCase();
    const okName = name ? tName.includes(name) : true;
    const okId = id ? tId === id : true;
    return okName && okId;
  });

  if (!list.length) {
    showInfo("⚠️ تنبيه", "لا توجد بيانات لهذا الموظف لتصديرها.");
    return;
  }

  const data = list.map((t, i) => ({
    "#": i + 1,
    "اسم الموظف": t.employee,
    "Employee ID": t.employeeId || "",
    "المهمة (KPI)": t.name,
    "الهدف": t.target,
    "الحالي": t.current,
    "نسبة الإنجاز %": t.percent,
    "الحالة": t.status === "done" ? "مكتمل" : t.status === "failed" ? "فشل" : "قيد التنفيذ",
    "الموعد النهائي": formatDateTime(t.deadline)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employee Tasks");

  const fileName = `Employee_Report_${rEmpName.value || "Employee"}_${rEmpId.value || ""}.xlsx`;
  XLSX.writeFile(wb, fileName);

  showInfo("✅ تم التصدير", "تم تنزيل تقرير Excel بنجاح.", "success");
}

if (exportExcelBtn) exportExcelBtn.onclick = exportReportToExcel;

// ===============================
// Init
// ===============================

async function initTasksPage() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;

  // realtime from Firestore
  subscribeTasks();

  // countdown live
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => updateCountdownLabels(), 1000);
}

initTasksPage();
