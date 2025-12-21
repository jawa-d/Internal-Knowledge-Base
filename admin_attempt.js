import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   INIT
=============================== */
const attemptId = localStorage.getItem("admin_selected_attempt");
if (!attemptId) location.href = "admin_exam.html";

const infoBox = document.getElementById("infoBox");
const questionsBox = document.getElementById("questionsBox");

const QUESTION_SCORE = 10;

let attempt, exam;
let autoScore = 0;

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
    <p><b>الرقم الوظيفي:</b> ${attempt.employeeId}</p>
    <p><b>الإيميل:</b> ${attempt.email}</p>
    <p><b>اسم الامتحان:</b> ${exam.title}</p>
  `;
}

/* ===============================
   Render Questions
=============================== */
function renderQuestions() {
  questionsBox.innerHTML = "";
  autoScore = 0;

  exam.questions.forEach((q, index) => {
    const ans = attempt.answers[q.id] || "";
    let score = 0;
    let correct = false;

    if (!q.requiresManual && String(ans) === String(q.correctAnswer)) {
      score = QUESTION_SCORE;
      autoScore += QUESTION_SCORE;
      correct = true;
    }

    const div = document.createElement("div");
    div.className = `question ${correct ? "correct" : "wrong"}`;

    div.innerHTML = `
      <h4>${index + 1}. ${q.title}</h4>
      <p><b>جواب الموظف:</b> ${ans || "—"}</p>
      <p><b>درجة السؤال:</b> ${score} / ${QUESTION_SCORE}</p>
    `;

    if (q.requiresManual) {
      div.innerHTML += `
        <label>درجة يدوية (0 - 10):</label>
        <input
          type="number"
          class="manual-input"
          min="0"
          max="10">
      `;
    }

    questionsBox.appendChild(div);
  });

  document.getElementById("autoScore").innerText = autoScore;
}

/* ===============================
   Finalize Correction
=============================== */
window.finalizeCorrection = async () => {
  let manualScore = 0;

  document.querySelectorAll(".manual-input")
    .forEach(i => manualScore += Number(i.value || 0));

  const totalScore = Math.min(autoScore + manualScore, 100);

  await updateDoc(doc(db, "exam_attempts", attemptId), {
    autoScore,
    manualScore,
    totalScore,
    status: "finalized",
    finalizedAt: new Date()
  });

  document.getElementById("manualScore").innerText = manualScore;
  document.getElementById("totalScore").innerText = totalScore;

  alert(`✅ تم إنهاء التصحيح\nالدرجة النهائية: ${totalScore} / 100`);
};

/* ===============================
   Start
=============================== */
loadData();
