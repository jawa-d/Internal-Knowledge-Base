import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const attemptId = localStorage.getItem("admin_selected_attempt");
if (!attemptId) location.href = "admin_exam.html";

const infoBox = document.getElementById("infoBox");
const questionsBox = document.getElementById("questionsBox");

let attempt, exam;
let autoScore = 0;
let manualScores = {};

/* ===============================
   Load Data
=============================== */
async function loadData() {
  const aSnap = await getDoc(doc(db, "exam_attempts", attemptId));
  attempt = aSnap.data();

  const eSnap = await getDoc(doc(db, "exams", attempt.examId));
  exam = eSnap.data();

  renderInfo();
  renderQuestions();
}

/* ===============================
   Render Info
=============================== */
function renderInfo() {
  infoBox.innerHTML = `
    <p><b>الاسم:</b> ${attempt.employeeName}</p>
    <p><b>Employee ID:</b> ${attempt.employeeId}</p>
    <p><b>Email:</b> ${attempt.email}</p>
    <p><b>الامتحان:</b> ${exam.title}</p>
    <p><b>محاولات الغش:</b> ${attempt.violations || 0}</p>
  `;
}

/* ===============================
   Render Questions
=============================== */
function renderQuestions() {
  questionsBox.innerHTML = "";
  autoScore = 0;

  exam.questions.forEach((q, index) => {
    const userAnswer = attempt.answers[q.id] || "";
    let isCorrect = false;
    let score = 0;

    // تصحيح تلقائي
    if (!q.requiresManual) {
      if (String(userAnswer) === String(q.correctAnswer)) {
        isCorrect = true;
        score = q.points;
        autoScore += q.points;
      }
    }

    const div = document.createElement("div");
    div.className = `question ${isCorrect ? "correct" : "wrong"}`;

    div.innerHTML = `
      <h4>${index + 1}. ${q.title}</h4>
      <div class="answer"><b>جواب الموظف:</b> ${userAnswer || "—"}</div>
      <div><b>درجة السؤال:</b> ${score} / ${q.points}</div>
    `;

    // تصحيح يدوي
    if (q.requiresManual) {
      div.innerHTML += `
        <div>
          <label>درجة التصحيح اليدوي:</label>
          <input type="number"
            class="manual-input"
            min="0"
            max="${q.points}"
            data-qid="${q.id}">
        </div>
      `;
    }

    questionsBox.appendChild(div);
  });

  document.getElementById("autoScore").innerText = autoScore;
}

/* ===============================
   Finalize
=============================== */
window.finalizeCorrection = async function () {
  let manualScore = 0;

  document.querySelectorAll(".manual-input").forEach(inp => {
    const val = Number(inp.value || 0);
    manualScore += val;
  });

  const totalScore = autoScore + manualScore;

  await updateDoc(doc(db, "exam_attempts", attemptId), {
    autoScore,
    manualScore,
    totalScore,
    status: "finalized",
    finalizedAt: new Date()
  });

  document.getElementById("manualScore").innerText = manualScore;
  document.getElementById("totalScore").innerText = totalScore;

  alert(`تم إنهاء تصحيح امتحان ${attempt.employeeName}`);
};

/* ===============================
   INIT
=============================== */
await loadData();
