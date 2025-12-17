import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Auth Guard
=============================== */
const email = localStorage.getItem("kb_user_email");
if (!email) {
  window.location.href = "login.html";
}

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

const btnEnter = document.getElementById("btnEnter");
const btnSave  = document.getElementById("btnSave");

/* ===============================
   State
=============================== */
let exam = null;
let attemptRef = null;
let answers = {};
let violations = 0;
let endAt = 0;
let timerInterval = null;

/* ===============================
   Load Active Exam
=============================== */
async function loadActiveExam() {
  const q = query(
    collection(db, "exams"),
    where("status", "==", "active")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    identityBox.innerHTML = "<p>لا يوجد امتحان متاح حاليًا</p>";
    return;
  }

  exam = {
    id: snap.docs[0].id,
    ...snap.docs[0].data()
  };

  examTitleEl.textContent = exam.title || "—";
  examDescEl.textContent  = exam.description || "";
}

/* ===============================
   Enter Exam
=============================== */
btnEnter.onclick = async () => {
  const name = empNameEl.value.trim();
  const empId = empIdEl.value.trim();

  if (!name || !empId) {
    alert("يرجى إدخال الاسم والرقم الوظيفي");
    return;
  }

  const attemptId = `${exam.id}_${empId}`;
  attemptRef = doc(db, "exam_attempts", attemptId);

  const existSnap = await getDoc(attemptRef);
  if (existSnap.exists()) {
    alert("تم أداء الامتحان مسبقًا");
    return;
  }

  await setDoc(attemptRef, {
    examId: exam.id,
    employeeName: name,
    employeeId: empId,
    email,
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
   Render Questions
=============================== */
function renderQuestions() {
  questionsEl.innerHTML = "";

  exam.questions.forEach((q, index) => {
    const box = document.createElement("div");
    box.className = "q";

    box.innerHTML = `
      <h4>${index + 1}. ${q.title}</h4>
    `;

    if (q.type === "mcq") {
      q.options.forEach(opt => {
        const lbl = document.createElement("label");
        lbl.innerHTML = `
          <input type="radio" name="${q.id}" value="${opt}">
          ${opt}
        `;
        box.appendChild(lbl);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.placeholder = "اكتب إجابتك هنا...";
      ta.oninput = () => {
        answers[q.id] = ta.value;
      };
      box.appendChild(ta);
    }

    box.addEventListener("change", () => {
      const checked = box.querySelector("input:checked");
      if (checked) answers[q.id] = checked.value;
    });

    questionsEl.appendChild(box);
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

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }, 1000);
}

/* ===============================
   Save Answers
=============================== */
btnSave.onclick = async () => {
  if (!attemptRef) return;

  await updateDoc(attemptRef, {
    answers,
    violations
  });

  showFinishPopup();
};

/* ===============================
   Submit Exam (Auto)
=============================== */
async function submitExam() {
  if (!attemptRef) return;

  await updateDoc(attemptRef, {
    answers,
    violations,
    status: "submitted",
    submittedAt: serverTimestamp()
  });

  showFinishPopup();
}

/* ===============================
   Anti-Cheat (Tab Change)
=============================== */
document.addEventListener("visibilitychange", async () => {
  if (document.hidden && attemptRef) {
    violations++;
    await updateDoc(attemptRef, { violations });
  }
});

/* ===============================
   Auto Submit on Leave
=============================== */
window.addEventListener("beforeunload", () => {
  if (attemptRef) {
    updateDoc(attemptRef, {
      answers,
      violations,
      status: "submitted",
      submittedAt: serverTimestamp()
    });
  }
});

/* ===============================
   Finish Popup
=============================== */
function showFinishPopup() {
  const popup = document.getElementById("finishPopup");
  if (!popup) {
    window.location.href = "dashboard.html";
    return;
  }

  popup.style.display = "flex";

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 3000);
}

/* ===============================
   INIT
=============================== */
await loadActiveExam();
