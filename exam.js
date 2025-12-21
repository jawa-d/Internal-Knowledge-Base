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

/* ===============================
   Load Active Exam
=============================== */
async function loadActiveExam() {
  const q = query(collection(db, "exams"), where("status", "==", "active"));
  const snap = await getDocsFromServer(q);

  if (snap.empty) {
    identityBox.innerHTML = "⚠️ لا يوجد امتحان حاليًا";
    return;
  }

  exam = snap.docs[0].data();
  exam.id = snap.docs[0].id;

  examTitleEl.textContent = exam.title;
  examDescEl.textContent  = exam.description;
  btnEnter.disabled = false;
}

/* ===============================
   Enter Exam (NO REPEAT)
=============================== */
btnEnter.onclick = async () => {
  const name = empNameEl.value.trim();
  const empId = empIdEl.value.trim();
  if (!name || !empId) return alert("أدخل البيانات");

  const attemptId = `${exam.id}_${empId}`;
  attemptRef = doc(db, "exam_attempts", attemptId);

  if ((await getDoc(attemptRef)).exists()) {
    alert("❌ لا يمكنك أداء الامتحان أكثر من مرة");
    btnEnter.disabled = true;
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
};

/* ===============================
   Render Questions
=============================== */
function renderQuestions() {
  questionsEl.innerHTML = "";
  answers = {};

  exam.questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<h4>${i + 1}. ${q.title}</h4>`;

    if (q.type === "mcq") {
      q.options.forEach(o => {
        div.innerHTML += `
          <label>
            <input type="radio" name="${q.id}" value="${o}">
            ${o}
          </label>`;
      });
    } else if (q.type === "tf") {
      div.innerHTML += `
        <label><input type="radio" name="${q.id}" value="true"> صح</label>
        <label><input type="radio" name="${q.id}" value="false"> خطأ</label>`;
    } else {
      const ta = document.createElement("textarea");
      ta.oninput = () => answers[q.id] = ta.value;
      div.appendChild(ta);
    }

    div.addEventListener("change", () => {
      const c = div.querySelector("input:checked");
      if (c) answers[q.id] = c.value;
    });

    questionsEl.appendChild(div);
  });
}

/* ===============================
   Submit
=============================== */
btnSave.onclick = async () => {
  await updateDoc(attemptRef, {
    answers,
    violations,
    status: "submitted",
    submittedAt: serverTimestamp()
  });
  alert("تم إرسال الامتحان");
  location.href = "dashboard.html";
};

/* ===============================
   Start
=============================== */
loadActiveExam();
