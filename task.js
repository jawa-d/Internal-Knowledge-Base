// ===== الإعدادات العامة =====
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

// ===== تحميل / حفظ =====
function loadTasks() {
  tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ===== حساب نسبة الإنجاز في الفورم =====
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
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  progressValueInput.value = percent;
  progressFill.style.width = percent + "%";
  progressLabel.textContent = percent + "%";
}

currentValueInput.addEventListener("input", calcPreviewProgress);
targetValueInput.addEventListener("input", calcPreviewProgress);

// ===== إنشاء تاسك جديد =====
createTaskBtn.addEventListener("click", () => {
  const employee = empNameInput.value.trim();
  const name = taskNameInput.value.trim();
  const target = Number(targetValueInput.value);
  const current = Number(currentValueInput.value);
  const deadlineValue = deadlineInput.value; // datetime-local

  if (!employee || !name || !target || !deadlineValue) {
    alert("الرجاء إدخال جميع الحقول المطلوبة.");
    return;
  }

  const createdAt = new Date().toISOString();
  const deadlineISO = new Date(deadlineValue).toISOString();

  let percent = 0;
  if (target > 0) {
    percent = Math.floor((current / target) * 100);
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
  }

  const status = percent >= 100 ? "done" : "in-progress";

  const task = {
    id: Date.now(),
    name,
    employee,
    target,
    current,
    percent,
    createdAt,
    deadline: deadlineISO,
    status
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

// ===== تحديث حالة كل تاسك حسب الوقت والإنجاز =====
function updateTaskStatuses() {
  const now = new Date();

  tasks.forEach(t => {
    const deadline = new Date(t.deadline);

    if (t.percent >= 100) {
      t.status = "done";
    } else if (now > deadline) {
      t.status = "failed";
    } else {
      t.status = "in-progress";
    }
  });

  saveTasks();
}

// ===== تنسيق الوقت المتبقي =====
function getRemainingText(task) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    if (task.percent >= 100) {
      return "✅ اكتملت المهمة قبل / عند الموعد النهائي.";
    } else {
      return "⛔ انتهى الوقت.";
    }
  }

  let seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);

  return `⏳ متبقّي: ${days} يوم / ${hours} ساعة / ${minutes} دقيقة`;
}

// ===== تنسيق تاريخ عربي بسيط =====
function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("ar-IQ", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// ===== عرض الكروت في الأعمدة =====
function renderBoard() {
  updateTaskStatuses();

  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  let inProgCount = 0;
  let doneCount = 0;

  tasks.forEach(t => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.id = t.id;

    if (t.status === "done") card.classList.add("done");
    if (t.status === "failed") card.classList.add("failed");

    // رأس الكارد
    const titleEl = document.createElement("h3");
    titleEl.textContent = t.name;
    titleEl.style.marginBottom = "4px";

    const empEl = document.createElement("p");
    empEl.textContent = `👤 الموظف: ${t.employee}`;
    empEl.style.margin = "0";

    const targetEl = document.createElement("p");
    targetEl.textContent = `🎯 الهدف: ${t.target}`;
    targetEl.style.margin = "0";

    const currentEl = document.createElement("p");
    currentEl.textContent = `📊 الحالي: ${t.current}`;
    currentEl.style.margin = "0";

    const createdEl = document.createElement("p");
    createdEl.textContent = `📅 تاريخ الإنشاء: ${formatDateTime(t.createdAt)}`;
    createdEl.style.margin = "0";

    const deadlineEl = document.createElement("p");
    deadlineEl.textContent = `⌛ الموعد النهائي: ${formatDateTime(t.deadline)}`;
    deadlineEl.style.margin = "0";

    card.appendChild(titleEl);
    card.appendChild(createdEl);
    card.appendChild(empEl);
    card.appendChild(targetEl);
    card.appendChild(currentEl);
    card.appendChild(deadlineEl);

    // شارة الحالة
    const badge = document.createElement("div");
    badge.classList.add("badge");

    if (t.status === "done") {
      badge.classList.add("badge-done");
      badge.textContent = "مكتمل ✔";
    } else if (t.status === "failed") {
      badge.classList.add("badge-failed");
      badge.textContent = "فشل ✘";
    } else {
      // in progress
      const deadline = new Date(t.deadline);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      const closeToDeadline = diff > 0 && diff <= 24 * 3600 * 1000; // أقل من يوم

      if (closeToDeadline) {
        badge.classList.add("badge-warning");
        badge.textContent = "قريب من انتهاء الوقت ⚠";
      } else {
        badge.classList.add("badge-progress");
        badge.textContent = "جاري التنفيذ ⏳";
      }
    }
    card.appendChild(badge);

    // الوقت المتبقي
    const remaining = document.createElement("p");
    remaining.className = "remaining-time";
    remaining.textContent = getRemainingText(t);
    card.appendChild(remaining);

    // شريط التقدم
    const progWrapper = document.createElement("div");
    progWrapper.className = "card-progress";

    const pBar = document.createElement("div");
    pBar.className = "progress";
    const pFill = document.createElement("div");
    pFill.className = "progress-fill";
    pFill.style.width = `${t.percent}%`;

    pBar.appendChild(pFill);
    progWrapper.appendChild(pBar);
    card.appendChild(progWrapper);

    // أزرار
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnUpdate = document.createElement("button");
    btnUpdate.className = "btn-small btn-update";
    btnUpdate.textContent = "تحديث الإنجاز";
    btnUpdate.addEventListener("click", (e) => {
      e.stopPropagation(); // حتى لا يفتح الـ popup
      updateTaskProgress(t.id);
    });

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-small btn-delete";
    btnDelete.textContent = "حذف";
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(t.id);
    });

    actions.appendChild(btnUpdate);
    actions.appendChild(btnDelete);
    card.appendChild(actions);

    // عند الضغط على الكارد نفسه → عرض رسالة شكر / عتب
    card.addEventListener("click", () => {
      showTaskFeedback(t);
    });

    if (t.status === "done") {
      colDone.appendChild(card);
      doneCount++;
    } else {
      colInProgress.appendChild(card);
      inProgCount++;
    }
  });

  countInProgress.textContent = inProgCount;
  countDone.textContent = doneCount;
}

// ===== تحديث الإنجاز (تجمع مع السابق) =====
function updateTaskProgress(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  const incStr = prompt("أدخل القيمة الإضافية التي تحققت (لن يتم استبدال القيمة الحالية، بل جمعها):", "0");
  if (incStr === null) return;

  const inc = Number(incStr);
  if (isNaN(inc)) {
    alert("قيمة غير صالحة.");
    return;
  }

  t.current = Number(t.current) + inc;

  if (t.target > 0) {
    t.percent = Math.floor((t.current / t.target) * 100);
  } else {
    t.percent = 0;
  }

  if (t.percent > 100) t.percent = 100;
  if (t.percent < 0) t.percent = 0;

  // إذا وصلت 100% قبل الوقت → مكتمل
  if (t.percent >= 100) {
    t.status = "done";
  }

  saveTasks();
  renderBoard();
}

// ===== حذف تاسك =====
function deleteTask(id) {
  if (!confirm("هل تريد حذف هذا التاسك؟")) return;
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  renderBoard();
}

// ===== Popup: رسالة شكر / عتب =====
function showTaskFeedback(task) {
  const now = new Date();
  const deadline = new Date(task.deadline);

  // تهيئة النصوص
  let title = "";
  let message = "";
  let boxClass = "";

  if (task.percent >= 100) {
    // ✅ مكتمل
    title = "🎉 أحسنت! المهمة مكتملة";
    message =
      `شكرًا لك يا ${task.employee} على إتمام هذه المهمة بنسبة 100%.
تم إنجاز العمل بنجاح ويُسجل لك هذا الإنجاز في تقييم الأداء.`;
    boxClass = "success";
  } else if (now > deadline) {
    // ❌ غير مكتمل + انتهى الوقت → رسالة عتب
    title = "⚠ لم يتم إكمال المهمة في الوقت المحدد";
    message =
      `لم يتم إكمال هذه المهمة قبل الموعد النهائي.
هذا يعتبر تقصير في الالتزام بالمهام، وقد يُعرِّض الموظف إلى تنبيه أو إجراء إداري حسب نظام الشركة.`;
    boxClass = "fail";
  } else {
    // ما زال الوقت مستمراً – تشجيع بسيط
    title = "⌛ المهمة قيد التنفيذ";
    message =
      `ما زال أمامك وقت لإنهاء المهمة يا ${task.employee}.
الرجاء بذل المزيد من الجهد للوصول إلى نسبة إنجاز أعلى قبل انتهاء الوقت.`;
    boxClass = "";
  }

  fbTitle.textContent = title;
  fbMessage.textContent = message;

  fbTaskName.textContent = task.name;
  fbEmpName.textContent = task.employee;
  fbPercent.textContent = task.percent.toString();
  fbDeadline.textContent = formatDateTime(task.deadline);

  // تنظيف كلاسات قديمة
  fbOverlay.querySelector(".fb-box").classList.remove("success", "fail");
  if (boxClass) {
    fbOverlay.querySelector(".fb-box").classList.add(boxClass);
  }

  fbOverlay.classList.add("active");
}

// إغلاق الـ popup
fbCloseBtn.addEventListener("click", () => {
  fbOverlay.classList.remove("active");
});

fbOverlay.addEventListener("click", (e) => {
  if (e.target === fbOverlay) {
    fbOverlay.classList.remove("active");
  }
});

// ===== تشغيل أولي و Timer للتحديث المستمر للوقت المتبقي =====
function initTasksPage() {
  loadTasks();
  renderBoard();

  // تحديث الوقت المتبقي كل 30 ثانية
  setInterval(() => {
    renderBoard();
  }, 30000);
}

initTasksPage();
