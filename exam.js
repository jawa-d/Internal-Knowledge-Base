import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocsFromServer,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Auth
=============================== */
const email = localStorage.getItem("kb_user_email");
if (!email) location.href = "login.html";

/* ===============================
   Elements
=============================== */
const examTitleEl = document.getElementById("examTitle");
const examDescEl  = document.getElementById("examDesc");
const timerEl     = document.getElementById("timer");

const identityBox = document.getElementById("identityBox");
const examBox     = document.getElementById("examBox");
const questionsEl = document.getElementById("questions");

const empNameEl = document.getElementById("empName");
const empIdEl   = document.getElementById("empId");
const btnEnter  = document.getElementById("btnEnter");
const btnSave   = document.getElementById("btnSave");

/* ===============================
   Helpers
=============================== */
function getSelectedSection() {
  const el = document.getElementById("examSection");
  return el ? el.value : "";
}

/* ===============================
   State
=============================== */
let exam = null;
let attemptRef = null;
let answers = {};
let selectedSection = "";
let endAt = 0;
let timerInterval = null;
let violations = 0;

btnEnter.disabled = true;

/* ===============================
   Load Active Exam
=============================== */
async function loadActiveExam() {
  try {
    const q = query(
      collection(db, "exams"),
      where("status", "==", "active")
    );

    const snap = await getDocsFromServer(q);

    if (snap.empty) {
      exam = null;
      btnEnter.disabled = true;
      identityBox.innerHTML = `
        <div class="no-exam-box">⚠️ لا يوجد امتحان حاليًا</div>
      `;
      return;
    }

    exam = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      )[0];

    examTitleEl.textContent = exam.title || "";
    examDescEl.textContent  = exam.description || "";
    btnEnter.disabled = false;

  } catch (err) {
    console.error(err);
    btnEnter.disabled = true;
    identityBox.innerHTML = `
      <div class="no-exam-box">❌ خطأ في تحميل الامتحان</div>
    `;
  }
}

/* ===============================
   Enter Exam
=============================== */
btnEnter.onclick = async () => {
  if (!exam) return;

  const name  = empNameEl.value.trim();
  const empId = empIdEl.value.trim();
  selectedSection = getSelectedSection(); // ✅ تخزين بالقيمة العامة

  if (!name || !empId) {
    alert("يرجى إدخال الاسم والرقم الوظيفي");
    return;
  }

  if (!selectedSection) {
    alert("يرجى اختيار القسم");
    return;
  }

  const attemptId = `${exam.id}_${empId}`;
  attemptRef = doc(db, "exam_attempts", attemptId);

  if ((await getDoc(attemptRef)).exists()) {
    alert("❌ لا يمكنك إعادة الامتحان");
    return;
  }

  await setDoc(attemptRef, {
    examId: exam.id,
    employeeName: name,
    employeeId: empId,
    email,
    section: selectedSection,
    answers: {},
    violations: 0,
    status: "started",
    startedAt: serverTimestamp()
  });

  identityBox.style.display = "none";
  examBox.style.display = "block";

  renderQuestions();
  startTimer();
};

/* ===============================
   Render Questions (By Section)
=============================== */
function renderQuestions() {
  questionsEl.innerHTML = "";
  answers = {};

  const sectionQuestions = exam.questions.filter(
    q => q.section === selectedSection
  );

  if (sectionQuestions.length === 0) {
    questionsEl.innerHTML = `
      <div class="no-questions">⚠️ لا توجد أسئلة لهذا القسم</div>
    `;
    return;
  }

  sectionQuestions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "question-card";

    card.innerHTML = `
      <div class="q-header">
        <div class="q-number">${index + 1}</div>
        <div class="q-title">${q.title}</div>
      </div>
      <div class="q-body"></div>
    `;

    const body = card.querySelector(".q-body");

    if (q.type === "mcq") {
      q.options.forEach(opt => {
        body.innerHTML += `
          <label class="option">
            <input type="radio" name="${q.id}" value="${opt}">
            <span>${opt}</span>
          </label>
        `;
      });
    }
    else if (q.type === "tf") {
      body.innerHTML += `
        <label class="option">
          <input type="radio" name="${q.id}" value="true"> ✔️ صح
        </label>
        <label class="option">
          <input type="radio" name="${q.id}" value="false"> ❌ خطأ
        </label>
      `;
    }
    else {
      body.innerHTML += `
        <textarea class="text-answer" placeholder="اكتب إجابتك هنا..."></textarea>
      `;
    }

    card.addEventListener("change", () => {
      const checked = card.querySelector("input:checked");
      if (checked) answers[q.id] = checked.value;

      const ta = card.querySelector("textarea");
      if (ta) answers[q.id] = ta.value;
    });

    questionsEl.appendChild(card);
  });
}

/* ===============================
   Timer
=============================== */
function startTimer() {
  endAt = Date.now() + (exam.durationMin || 10) * 60000;

  timerInterval = setInterval(() => {
    const diff = endAt - Date.now();

    if (diff <= 0) {
      clearInterval(timerInterval);
      submitExam();
      return;
    }

    timerEl.textContent =
      Math.floor(diff / 60000) + ":" +
      String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  }, 1000);
}

/* ===============================
   Submit Exam
=============================== */
btnSave.onclick = () => submitExam();

async function submitExam() {
  if (!attemptRef) return;

  await updateDoc(attemptRef, {
    answers,
    violations,
    status: "submitted",
    submittedAt: serverTimestamp()
  });

  showFinishPopupAndRedirect();
}

/* ===============================
   Finish Popup + Redirect
=============================== */
function showFinishPopupAndRedirect() {
  const popup = document.getElementById("finishPopup");
  const cd = document.getElementById("countdown");

  if (!popup) return;

  popup.style.display = "flex";

  let counter = 3;
  if (cd) cd.textContent = counter;

  const interval = setInterval(() => {
    counter--;
    if (cd) cd.textContent = counter;

    if (counter <= 0) {
      clearInterval(interval);
      window.location.replace("dashboard.html");
    }
  }, 1000);
}

/* ===============================
   Anti Cheat
=============================== */
document.addEventListener("visibilitychange", async () => {
  if (document.hidden && attemptRef) {
    violations++;
    await updateDoc(attemptRef, { violations });
  }
});

/* ===============================
   Init
=============================== */
await loadActiveExam();
