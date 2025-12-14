// ===============================
// 🔐 Admin Access Guard
// ===============================
import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

async function checkAdminAccess() {
  const email = localStorage.getItem("kb_user_email");

  // غير مسجل دخول
  if (!email) {
    window.location.href = "login.html";
    return false;
  }

  try {
    const snap = await getDoc(doc(db, "users", email));

    // غير Admin
    if (!snap.exists() || snap.data().role !== "admin") {
      document.getElementById("taskPageContent").style.display = "none";
      document.getElementById("unauthorizedBox").style.display = "flex";
      return false;
    }

    // Admin ✔
    return true;

  } catch (err) {
    console.error("Permission check error:", err);
    alert("خطأ في التحقق من الصلاحيات");
    return false;
  }
}

// ===============================
// ===== الإعدادات العامة =====
// ===============================
const TASKS_KEY = "kb_tasks_board_v3";
let tasks = [];

// عناصر صفحة الإنشاء
const empNameInput = document.getElementById("empName");
const taskNameInput = document.getElementById("taskName");
const targetValueInput = document.getElementById("targetValue");
const currentValueInput = document.getElementById("currentValue");
const deadlineInput = document.getElementById("deadline");
const progressValueInput = document.getElementById("progressValue");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const createTaskBtn = document.getElementById("createTaskBtn");

// الأعمدة
const colInProgress = document.getElementById("colInProgress");
const colDone = document.getElementById("colDone");
const countInProgress = document.getElementById("countInProgress");
const countDone = document.getElementById("countDone");

// عناصر الـ Popup
const fbOverlay = document.getElementById("feedbackOverlay");
const fbTitle = document.getElementById("fbTitle");
const fbMessage = document.getElementById("fbMessage");
const fbTaskName = document.getElementById("fbTaskName");
const fbEmpName = document.getElementById("fbEmpName");
const fbPercent = document.getElementById("fbPercent");
const fbDeadline = document.getElementById("fbDeadline");
const fbCloseBtn = document.getElementById("fbCloseBtn");

// ===============================
// ===== تحميل / حفظ =====
// ===============================
function loadTasks() {
  tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ===============================
// ===== حساب نسبة الإنجاز =====
// ===============================
function calcPreviewProgress() {
  const t = Number(targetValueInput.value);
  const c = Number(currentValueInput.value);

  if (!t || t <= 0) {
    progressValueInput.value = "";
    progressFill.style.width = "0%";
    progressLabel.textContent = "0%";
    return;
  }

  let percent = Math.floor((c / t) * 100);
  percent = Math.max(0, Math.min(100, percent));

  progressValueInput.value = percent;
  progressFill.style.width = percent + "%";
  progressLabel.textContent = percent + "%";
}

currentValueInput.addEventListener("input", calcPreviewProgress);
targetValueInput.addEventListener("input", calcPreviewProgress);

// ===============================
// ===== إنشاء تاسك =====
// ===============================
createTaskBtn.addEventListener("click", () => {
  const employee = empNameInput.value.trim();
  const name = taskNameInput.value.trim();
  const target = Number(targetValueInput.value);
  const current = Number(currentValueInput.value);
  const deadlineValue = deadlineInput.value;

  if (!employee || !name || !target || !deadlineValue) {
    alert("الرجاء إدخال جميع الحقول المطلوبة.");
    return;
  }

  let percent = Math.floor((current / target) * 100);
  percent = Math.max(0, Math.min(100, percent));

  const task = {
    id: Date.now(),
    name,
    employee,
    target,
    current,
    percent,
    createdAt: new Date().toISOString(),
    deadline: new Date(deadlineValue).toISOString(),
    status: percent >= 100 ? "done" : "in-progress"
  };

  tasks.push(task);
  saveTasks();
  renderBoard();
  clearForm();
  alert("تم إنشاء التاسك بنجاح ✔");
});

function clearForm() {
  empNameInput.value = "";
  taskNameInput.value = "";
  targetValueInput.value = "";
  currentValueInput.value = "";
  deadlineInput.value = "";
  progressValueInput.value = "";
  progressFill.style.width = "0%";
  progressLabel.textContent = "0%";
}

// ===============================
// ===== تحديث الحالات =====
// ===============================
function updateTaskStatuses() {
  const now = new Date();

  tasks.forEach(t => {
    const deadline = new Date(t.deadline);

    if (t.percent >= 100) t.status = "done";
    else if (now > deadline) t.status = "failed";
    else t.status = "in-progress";
  });

  saveTasks();
}

// ===============================
// ===== عرض البورد =====
// ===============================
function renderBoard() {
  updateTaskStatuses();

  colInProgress.innerHTML = "";
  colDone.innerHTML = "";
  let inProg = 0, done = 0;

  tasks.forEach(t => {
    const card = document.createElement("div");
    card.className = "task-card";
    if (t.status === "done") card.classList.add("done");
    if (t.status === "failed") card.classList.add("failed");

    card.innerHTML = `
      <h3>${t.name}</h3>
      <p>👤 ${t.employee}</p>
      <p>🎯 الهدف: ${t.target}</p>
      <p>📊 الحالي: ${t.current}</p>
      <p>⌛ الموعد: ${formatDateTime(t.deadline)}</p>
      <div class="badge ${t.status}">${t.status}</div>
      <div class="progress"><div class="progress-fill" style="width:${t.percent}%"></div></div>
    `;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnUpdate = document.createElement("button");
    btnUpdate.textContent = "تحديث";
    btnUpdate.onclick = e => {
      e.stopPropagation();
      updateTaskProgress(t.id);
    };

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "حذف";
    btnDelete.onclick = e => {
      e.stopPropagation();
      deleteTask(t.id);
    };

    actions.append(btnUpdate, btnDelete);
    card.appendChild(actions);

    card.onclick = () => showTaskFeedback(t);

    if (t.status === "done") {
      colDone.appendChild(card);
      done++;
    } else {
      colInProgress.appendChild(card);
      inProg++;
    }
  });

  countInProgress.textContent = inProg;
  countDone.textContent = done;
}

// ===============================
// ===== أدوات =====
// ===============================
function updateTaskProgress(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  const inc = Number(prompt("أدخل القيمة الإضافية:", "0"));
  if (isNaN(inc)) return alert("قيمة غير صالحة");

  t.current += inc;
  t.percent = Math.min(100, Math.floor((t.current / t.target) * 100));
  if (t.percent >= 100) t.status = "done";

  saveTasks();
  renderBoard();
}

function deleteTask(id) {
  if (!confirm("هل تريد حذف التاسك؟")) return;
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  renderBoard();
}

function formatDateTime(d) {
  return new Date(d).toLocaleString("ar-IQ", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// ===============================
// ===== Popup =====
// ===============================
function showTaskFeedback(task) {
  fbTitle.textContent = task.percent >= 100 ? "🎉 مكتمل" : "⌛ قيد التنفيذ";
  fbMessage.textContent = `الموظف: ${task.employee}`;
  fbTaskName.textContent = task.name;
  fbEmpName.textContent = task.employee;
  fbPercent.textContent = task.percent;
  fbDeadline.textContent = formatDateTime(task.deadline);
  fbOverlay.classList.add("active");
}

fbCloseBtn.onclick = () => fbOverlay.classList.remove("active");

// ===============================
// ===== تشغيل الصفحة =====
// ===============================
async function initTasksPage() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;

  loadTasks();
  renderBoard();
  setInterval(renderBoard, 30000);
}

initTasksPage();
