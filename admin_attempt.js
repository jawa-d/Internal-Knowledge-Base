import { db } from "./firebase.js";
import { doc, getDoc, updateDoc } from
  "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const attemptId = localStorage.getItem("admin_selected_attempt");
if (!attemptId) location.href="admin_exam.html";

const infoBox=document.getElementById("infoBox");
const questionsBox=document.getElementById("questionsBox");

const QUESTION_SCORE=10; // كل سؤال = 10
let attempt, exam;
let autoScore=0;

/* Load */
async function loadData(){
  const aSnap=await getDoc(doc(db,"exam_attempts",attemptId));
  if(!aSnap.exists()){
    alert("المحاولة غير موجودة");
    location.href="admin_exam.html";
    return;
  }
  attempt=aSnap.data();

  const eSnap=await getDoc(doc(db,"exams",attempt.examId));
  if(!eSnap.exists()){
    alert("الامتحان غير موجود");
    location.href="admin_exam.html";
    return;
  }
  exam=eSnap.data();

  renderInfo();
  renderQuestions();
}

function renderInfo(){
  infoBox.innerHTML=`
    <p><b>الاسم:</b> ${attempt.employeeName || "—"}</p>
    <p><b>الرقم الوظيفي:</b> ${attempt.employeeId || "—"}</p>
    <p><b>الإيميل:</b> ${attempt.email || "—"}</p>
    <p><b>القسم:</b> ${attempt.section || "—"}</p>
    <p><b>اسم الامتحان:</b> ${exam.title || "—"}</p>
  `;
}

function renderQuestions(){
  questionsBox.innerHTML="";
  autoScore=0;

  const sec = attempt.section || "";
  const allQuestions = Array.isArray(exam.questions) ? exam.questions : [];
  const sectionQuestions = sec
    ? allQuestions.filter(q => String(q.section || "") === String(sec))
    : allQuestions;

  if(sectionQuestions.length === 0){
    questionsBox.innerHTML = `
      <div style="padding:12px;border:1px dashed #cbd5e1;border-radius:14px;color:#64748b;background:#f8fafc">
        ⚠️ لا توجد أسئلة لهذا القسم داخل الامتحان
      </div>
    `;
    document.getElementById("autoScore").innerText = 0;
    return;
  }

  sectionQuestions.forEach((q,i)=>{
    const ans = (attempt.answers && attempt.answers[q.id]) ? attempt.answers[q.id] : "";
    let score=0;
    let correct=false;

    if(!q.requiresManual && String(ans) === String(q.correctAnswer)){
      score=QUESTION_SCORE;
      autoScore += QUESTION_SCORE;
      correct=true;
    }

    const div=document.createElement("div");
    div.className=`question ${correct?"correct":"wrong"}`;
    div.innerHTML=`
      <h4>${i+1}. ${q.title || "—"}</h4>
      <p><b>جواب الموظف:</b> ${ans || "—"}</p>
      <p>درجة السؤال: ${score} / 10</p>
    `;

    if(q.requiresManual){
      div.innerHTML+=`
        <label>درجة يدوية:</label>
        <input class="manual-input" type="number" min="0" max="10" value="0">
      `;
    }

    questionsBox.appendChild(div);
  });

  document.getElementById("autoScore").innerText=autoScore;
}

window.finalizeCorrection=async()=>{
  let manual=0;
  document.querySelectorAll(".manual-input")
    .forEach(i=>manual += Number(i.value || 0));

  const total = Math.min(autoScore + manual, 100);

  await updateDoc(doc(db,"exam_attempts",attemptId),{
    autoScore,
    manualScore: manual,
    totalScore: total,
    status:"finalized",
    finalizedAt: new Date(),
    passScore: exam.passScore ?? 60
  });

  document.getElementById("manualScore").innerText = manual;
  document.getElementById("totalScore").innerText = total;

  alert(`✅ تم إنهاء التصحيح\nالدرجة: ${total} / 100`);
};

loadData();
