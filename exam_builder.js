import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
  Admin Guard
=============================== */
let currentEmail = "";
let isAdmin = false;

async function checkAdminAccess() {
  currentEmail = localStorage.getItem("kb_user_email") || "";
  if (!currentEmail) { location.href = "login.html"; return; }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? (snap.data().role || "") : "";
  isAdmin = String(role).toLowerCase() === "admin";

  if (!isAdmin) {
    alert("غير مخول للدخول إلى Exam Builder");
    location.href = "dashboard.html";
  }
}

/* ===============================
  UI Refs
=============================== */
const examTitle = document.getElementById("examTitle");
const examDesc = document.getElementById("examDesc");
const durationMin = document.getElementById("durationMin");
const passScore = document.getElementById("passScore");
const btnNewExam = document.getElementById("btnNewExam");
const btnClone = document.getElementById("btnClone");
const btnAddQ = document.getElementById("btnAddQ");
const btnSave = document.getElementById("btnSave");
const btnDelete = document.getElementById("btnDelete");
const questionsWrap = document.getElementById("questionsWrap");
const examStatus = document.getElementById("examStatus");
const currentExamHint = document.getElementById("currentExamHint");

/* ===============================
  State
=============================== */
let examId = localStorage.getItem("selectedExamId") || "";
let examData = null;

function uid() { return "q_" + Math.random().toString(16).slice(2) + Date.now(); }

function enableEditing(on) {
  btnAddQ.disabled = !on;
  btnSave.disabled = !on;
  btnDelete.disabled = !on;
  btnClone.disabled = !on;
  examStatus.disabled = !on;
}

function normalizeQuestion(q){
  return {
    id: q.id || uid(),
    type: q.type || "mcq",
    title: q.title || "",
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer ?? "",
    points: Number(q.points ?? 1),
    requiresManual: Boolean(q.requiresManual ?? (q.type === "essay" || q.type === "short"))
  };
}

function renderQuestions() {
  questionsWrap.innerHTML = "";
  const qs = (examData?.questions || []).map(normalizeQuestion);

  qs.forEach((q, idx) => {
    const el = document.createElement("div");
    el.className = "qcard";
    el.dataset.qid = q.id;

    el.innerHTML = `
      <div class="qtop">
        <div class="qmeta">
          <span class="badge">#${idx+1}</span>
          <span class="small">ID: ${q.id}</span>
        </div>
        <div class="qmeta">
          <select class="select qType">
            <option value="mcq" ${q.type==="mcq"?"selected":""}>MCQ</option>
            <option value="tf" ${q.type==="tf"?"selected":""}>True/False</option>
            <option value="short" ${q.type==="short"?"selected":""}>Short</option>
            <option value="essay" ${q.type==="essay"?"selected":""}>Essay</option>
          </select>
          <input class="qPoints" type="number" min="0" value="${q.points}" style="width:120px" />
          <button class="btn danger qDel">حذف</button>
        </div>
      </div>

      <div class="row">
        <div class="field" style="min-width:320px">
          <label>نص السؤال</label>
          <input class="qTitle" value="${escapeHtml(q.title)}" placeholder="اكتب السؤال...">
        </div>
        <div class="field" style="min-width:240px">
          <label>التصحيح</label>
          <select class="select qManual">
            <option value="auto" ${q.requiresManual ? "" : "selected"}>تلقائي</option>
            <option value="manual" ${q.requiresManual ? "selected" : ""}>يدوي</option>
          </select>
        </div>
      </div>

      <div class="qopts"></div>
    `;

    const optsBox = el.querySelector(".qopts");
    const typeSel = el.querySelector(".qType");
    const manualSel = el.querySelector(".qManual");

    function renderOptions() {
      optsBox.innerHTML = "";

      const t = typeSel.value;
      if (t === "mcq") {
        const opts = q.options.length ? q.options : ["", "", "", ""];
        optsBox.innerHTML = `
          <label class="small">الخيارات</label>
          ${opts.map((o,i)=>`
            <div class="optRow">
              <input class="opt" data-i="${i}" value="${escapeHtml(o)}" placeholder="خيار ${i+1}">
            </div>`).join("")}
          <div class="row">
            <button class="btn addOpt">+ خيار</button>
            <button class="btn delOpt">- خيار</button>
            <div class="field" style="min-width:240px">
              <label>الإجابة الصحيحة (نص الخيار)</label>
              <input class="qCorrect" value="${escapeHtml(String(q.correctAnswer||""))}" placeholder="مثال: خيار 1">
            </div>
          </div>
        `;
      } else if (t === "tf") {
        optsBox.innerHTML = `
          <div class="row">
            <div class="field" style="min-width:240px">
              <label>الإجابة الصحيحة</label>
              <select class="select qCorrect">
                <option value="true" ${String(q.correctAnswer)==="true"?"selected":""}>True</option>
                <option value="false" ${String(q.correctAnswer)==="false"?"selected":""}>False</option>
              </select>
            </div>
          </div>
        `;
      } else {
        optsBox.innerHTML = `
          <div class="row">
            <div class="field" style="min-width:320px">
              <label>إجابة نموذجية (اختياري)</label>
              <input class="qCorrect" value="${escapeHtml(String(q.correctAnswer||""))}" placeholder="للمقارنة أو للمصحح">
            </div>
          </div>
        `;
      }
    }

    renderOptions();

    // listeners
    el.querySelector(".qDel").onclick = () => {
      examData.questions = examData.questions.filter(x => x.id !== q.id);
      renderQuestions();
    };

    typeSel.onchange = () => { q.type = typeSel.value; q.requiresManual = (q.type==="essay"||q.type==="short"); manualSel.value = q.requiresManual ? "manual":"auto"; renderOptions(); };

    el.querySelector(".qTitle").oninput = (e) => { q.title = e.target.value; };
    el.querySelector(".qPoints").oninput = (e) => { q.points = Number(e.target.value||0); };
    manualSel.onchange = () => { q.requiresManual = manualSel.value === "manual"; };

    optsBox.addEventListener("input", (e) => {
      if (e.target.classList.contains("opt")) {
        const i = Number(e.target.dataset.i);
        q.options[i] = e.target.value;
      }
      if (e.target.classList.contains("qCorrect")) {
        q.correctAnswer = e.target.value;
      }
    });

    optsBox.addEventListener("click", (e) => {
      if (e.target.classList.contains("addOpt")) {
        q.options.push("");
        renderOptions();
      }
      if (e.target.classList.contains("delOpt")) {
        q.options.pop();
        renderOptions();
      }
    });

    // sync back to examData
    const idxIn = examData.questions.findIndex(x => x.id === q.id);
    examData.questions[idxIn] = q;

    questionsWrap.appendChild(el);
  });
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ===============================
  CRUD
=============================== */
async function createNewExam() {
  const title = examTitle.value.trim();
  if (!title) return alert("اكتب عنوان الامتحان");

  const ref = await addDoc(collection(db, "exams"), {
    title,
    description: examDesc.value.trim(),
    durationMin: Number(durationMin.value || 20),
    passScore: Number(passScore.value || 60),
    status: "draft",
    questions: [],
    createdAt: serverTimestamp(),
    createdBy: currentEmail
  });

  examId = ref.id;
  localStorage.setItem("selectedExamId", examId);
  await loadExam();
}

async function loadExam() {
  if (!examId) {
    enableEditing(false);
    currentExamHint.textContent = "لا يوجد Exam محدد. أنشئ امتحان جديد.";
    return;
  }

  const snap = await getDoc(doc(db, "exams", examId));
  if (!snap.exists()) {
    enableEditing(false);
    currentExamHint.textContent = "الامتحان غير موجود.";
    return;
  }

  examData = { id: examId, ...snap.data() };
  examTitle.value = examData.title || "";
  examDesc.value = examData.description || "";
  durationMin.value = examData.durationMin ?? 20;
  passScore.value = examData.passScore ?? 60;
  examStatus.value = examData.status || "draft";

  currentExamHint.textContent = `ExamID: ${examId} | Status: ${examData.status}`;
  enableEditing(true);
  renderQuestions();
}

async function saveExam() {
  if (!examId || !examData) return;

  examData.title = examTitle.value.trim();
  examData.description = examDesc.value.trim();
  examData.durationMin = Number(durationMin.value || 20);
  examData.passScore = Number(passScore.value || 60);
  examData.status = examStatus.value;

  // normalize
  examData.questions = (examData.questions || []).map(normalizeQuestion);

  await updateDoc(doc(db, "exams", examId), {
    title: examData.title,
    description: examData.description,
    durationMin: examData.durationMin,
    passScore: examData.passScore,
    status: examData.status,
    questions: examData.questions
  });

  alert("✅ تم الحفظ");
}

async function deleteExam() {
  if (!examId) return;
  if (!confirm("حذف الامتحان؟")) return;

  await deleteDoc(doc(db, "exams", examId));
  localStorage.removeItem("selectedExamId");
  examId = "";
  examData = null;
  questionsWrap.innerHTML = "";
  enableEditing(false);
  currentExamHint.textContent = "تم حذف الامتحان.";
}

async function cloneExam() {
  if (!examData) return;
  const ref = await addDoc(collection(db, "exams"), {
    ...examData,
    status: "draft",
    title: (examData.title || "Exam") + " (Copy)",
    createdAt: serverTimestamp(),
    createdBy: currentEmail
  });
  examId = ref.id;
  localStorage.setItem("selectedExamId", examId);
  await loadExam();
}

/* ===============================
  Init
=============================== */
await checkAdminAccess();
await loadExam();

btnNewExam.onclick = createNewExam;
btnAddQ.onclick = () => {
  if (!examData) return;
  examData.questions.push(normalizeQuestion({}));
  renderQuestions();
};
btnSave.onclick = saveExam;
btnDelete.onclick = deleteExam;
btnClone.onclick = cloneExam;
examStatus.onchange = () => { if (examData) examData.status = examStatus.value; };
