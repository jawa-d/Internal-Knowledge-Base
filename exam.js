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
   Auth Guard
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

const btnEnter = document.getElementById("btnEnter");
const btnSave  = document.getElementById("btnSave");

btnEnter.disabled = true;

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
  try {
    const q = query(
      collection(db, "exams"),
      where("status", "==", "active")
    );

    const snap = await getDocsFromServer(q);

    if (snap.empty) {
      identityBox.innerHTML = "<p>❌ لا يوجد امتحان متاح حاليًا</p>";
      return;
    }

    exam = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];

    examTitleEl.textContent = exam.title || "—";
    examDescEl.textContent  = exam.description || "—";

    btnEnter.disabled = false;
  } catch (err) {
    console.error(err);
    identityBox.innerHTML = "<p>⚠️ خطأ في تحميل الامتحان</p>";
  }
}

/* ===============================
   Enter Exam
=============================== */
btnEnter.onclick = async () => {
  if (!exam) return;

  const name = empNameEl.value.trim();
  const empId = empIdEl.value.trim();
  if (!name || !empId) return alert("يرجى إدخال الاسم والرقم الوظيفي");

  const attemptId = `${exam.id}_${empId}`;
  attemptRef = doc(db, "exam_attempts", attemptId);

  if ((await getDoc(attemptRef)).exists()) {
    alert("❌ تم أداء الامتحان مسبقًا");
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
   Render Questions (FIXED)
=============================== */
function renderQuestions() {
  questionsEl.innerHTML = "";
  answers = {};

  exam.questions.forEach((q, index) => {
    const box = document.createElement("div");
    box.className = "q";

    box.innerHTML = `<h4>${index + 1}. ${q.title}</h4>`;

    // ✅ MCQ
    if (q.type === "mcq") {
      q.options.forEach(opt => {
        box.innerHTML += `
          <label>
            <input type="radio" name="${q.id}" value="${opt}">
            ${opt}
          </label>
        `;
      });
    }

    // ✅ TRUE / FALSE (FIX)
    else if (q.type === "tf") {
      box.innerHTML += `
        <label>
          <input type="radio" name="${q.id}" value="true">
          ✔️ صح
        </label>
        <label>
          <input type="radio" name="${q.id}" value="false">
          ❌ خطأ
        </label>
      `;
    }

    // ✅ TEXT
    else {
      const ta = document.createElement("textarea");
      ta.placeholder = "اكتب إجابتك هنا...";
      ta.oninput = () => answers[q.id] = ta.value;
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
    timerEl.textContent =
      Math.floor(diff / 60000) + ":" +
      String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  }, 1000);
}

/* ===============================
   Save / Submit
=============================== */
btnSave.onclick = async () => submitExam();

async function submitExam() {
  if (!attemptRef) return;
  await updateDoc(attemptRef, {
    answers,
    violations,
    status: "submitted",
    submittedAt: serverTimestamp()
  });
  document.getElementById("finishPopup").style.display = "flex";
  setTimeout(() => location.href = "dashboard.html", 3000);
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
