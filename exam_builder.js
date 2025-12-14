// ===============================
// 🔐 Admin Access Guard (مثل task.js)
// ===============================
import { db } from "./firebase.js";
import {
  doc,
  getDoc
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
      document.getElementById("builderContent").style.display = "none";
      document.getElementById("unauthorizedBox").style.display = "flex";
      return false;
    }

    return true;
  } catch (e) {
    console.error(e);
    alert("خطأ في التحقق من الصلاحيات");
    return false;
  }
}

// ===============================
// ===== Exam Builder Logic =====
// ===============================
const QUESTIONS_KEY = "kb_exam_questions";
let questions = [];
let editingId = null;

// DOM
const questionsList = document.getElementById("questionsList");
const countLabel = document.getElementById("countLabel");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const qTextInput = document.getElementById("qText");
const qTypeSelect = document.getElementById("qType");
const qManualCheckbox = document.getElementById("qManual");
const choicesBox = document.getElementById("choicesBox");
const opt1Input = document.getElementById("opt1");
const opt2Input = document.getElementById("opt2");
const opt3Input = document.getElementById("opt3");
const opt4Input = document.getElementById("opt4");
const correctIndexInput = document.getElementById("correctIndex");
const addQuestionBtn = document.getElementById("addQuestionBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

// تحميل
function loadQuestions() {
  questions = JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "[]");
}

// حفظ
function saveQuestions() {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

// عرض
function renderQuestions() {
  questionsList.innerHTML = "";
  countLabel.textContent = questions.length;

  if (questions.length === 0) {
    questionsList.innerHTML =
      `<p style="font-size:13px;color:#6b7280;">لا توجد أسئلة بعد.</p>`;
    return;
  }

  questions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "q-card";

    card.innerHTML = `
      <div class="q-card-header">
        <div><b>${index + 1}) ${q.text}</b></div>
        <div class="q-tags">
          <span class="tag">${q.type === "choice" ? "اختيارات" : "نصي"}</span>
          <span class="tag ${q.manual ? "manual" : ""}">
            ${q.manual ? "Manual" : "Auto"}
          </span>
        </div>
      </div>
      <div style="font-size:13px;color:#6b7280;margin:4px 0;">
        ${q.type === "choice"
          ? q.options.map((o, i) => `${i + 1}) ${o}`).join(" | ")
          : "سؤال نصي"}
      </div>
      <div class="card-actions">
        <button class="btn-edit">تعديل</button>
        <button class="btn-delete">حذف</button>
      </div>
    `;

    card.querySelector(".btn-edit").onclick = () => openEditQuestion(q.id);
    card.querySelector(".btn-delete").onclick = () => deleteQuestion(q.id);

    questionsList.appendChild(card);
  });
}

// Popup
function openAddQuestion() {
  editingId = null;
  popupTitle.textContent = "إضافة سؤال جديد";
  qTextInput.value = "";
  qTypeSelect.value = "choice";
  qManualCheckbox.checked = false;
  opt1Input.value = opt2Input.value = opt3Input.value = opt4Input.value = "";
  correctIndexInput.value = "";
  choicesBox.style.display = "block";
  popup.style.display = "flex";
}

function openEditQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;

  editingId = id;
  popupTitle.textContent = "تعديل السؤال";
  qTextInput.value = q.text;
  qTypeSelect.value = q.type;
  qManualCheckbox.checked = !!q.manual;

  if (q.type === "choice") {
    choicesBox.style.display = "block";
    opt1Input.value = q.options?.[0] || "";
    opt2Input.value = q.options?.[1] || "";
    opt3Input.value = q.options?.[2] || "";
    opt4Input.value = q.options?.[3] || "";
    correctIndexInput.value = (q.correctIndex + 1);
  } else {
    choicesBox.style.display = "none";
  }

  popup.style.display = "flex";
}

function deleteQuestion(id) {
  if (!confirm("هل تريد حذف السؤال؟")) return;
  questions = questions.filter(q => q.id !== id);
  saveQuestions();
  renderQuestions();
}

function saveQuestion() {
  const text = qTextInput.value.trim();
  const type = qTypeSelect.value;
  const manual = qManualCheckbox.checked;

  if (!text) return alert("أدخل نص السؤال");

  const q = {
    id: editingId || Date.now(),
    text,
    type,
    manual
  };

  if (type === "choice") {
    const opts = [
      opt1Input.value.trim(),
      opt2Input.value.trim(),
      opt3Input.value.trim(),
      opt4Input.value.trim()
    ].filter(Boolean);

    if (opts.length < 2) return alert("أدخل خيارين على الأقل");

    const correct = Number(correctIndexInput.value);
    if (correct < 1 || correct > opts.length) {
      return alert("رقم الإجابة غير صحيح");
    }

    q.options = opts;
    q.correctIndex = correct - 1;
  }

  if (editingId) {
    const idx = questions.findIndex(x => x.id === editingId);
    questions[idx] = q;
  } else {
    questions.push(q);
  }

  saveQuestions();
  renderQuestions();
  popup.style.display = "none";
}

// Events
addQuestionBtn.onclick = openAddQuestion;
saveBtn.onclick = saveQuestion;
cancelBtn.onclick = () => popup.style.display = "none";
qTypeSelect.onchange = () =>
  choicesBox.style.display = qTypeSelect.value === "choice" ? "block" : "none";

// Init
async function initExamBuilder() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;

  loadQuestions();
  renderQuestions();
}

initExamBuilder();
