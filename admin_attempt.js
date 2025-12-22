import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* Admin Guard */
const currentEmail = localStorage.getItem("kb_user_email") || "";
if (!currentEmail) location.href = "login.html";
const uSnap = await getDoc(doc(db,"users", currentEmail));
const isAdmin = uSnap.exists() && String(uSnap.data().role||"").toLowerCase() === "admin";
if (!isAdmin) { alert("غير مخول"); location.href="dashboard.html"; }

/* State */
const attemptId = localStorage.getItem("admin_selected_attempt");
if (!attemptId) location.href = "admin_exam.html";

const infoBox = document.getElementById("infoBox");
const questionsBox = document.getElementById("questionsBox");
const adminNoteEl = document.getElementById("adminNote");
const finishOverlay = document.getElementById("finishOverlay");

const autoScoreEl = document.getElementById("autoScore");
const manualScoreEl = document.getElementById("manualScore");
const totalScoreEl = document.getElementById("totalScore");

const btnFinalize = document.getElementById("btnFinalize");
const btnPDF = document.getElementById("btnPDF");
const btnExcel = document.getElementById("btnExcel");

let attempt = null;
let exam = null;

let autoRaw = 0;
let manualRaw = 0;
let maxRaw = 0;

function uid(){ return "q_" + Math.random().toString(16).slice(2) + Date.now(); }

function cleanTF(v){
  return String(v ?? "")
    .replace(/[✔️✅❌✖️]/g,"")
    .trim().toLowerCase();
}
function parseTF(v){
  const s = cleanTF(v);
  if (["true","1","yes","y","صح","صحيح"].includes(s)) return true;
  if (["false","0","no","n","خطأ","خاطئ","خطاء"].includes(s)) return false;
  return null;
}
function formatTF(v){
  const b = parseTF(v);
  if (b === true) return "✔️ صح";
  if (b === false) return "❌ خطأ";
  return String(v ?? "—");
}
function sameText(a,b){
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}
function normalizeQuestion(q){
  const type = q.type || "tf";
  const defaultMode = (type === "essay" || type === "short") ? "manual" : "auto";
  return {
    id: q.id || uid(),
    section: q.section || "Inbound",
    type,
    title: q.title || "",
    points: Number(q.points ?? 1),
    correctionMode: q.correctionMode || defaultMode,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer ?? ""
  };
}
function num(v,d=0){ const n = Number(v); return Number.isFinite(n) ? n : d; }

/* Load */
async function loadData(){
  const aSnap = await getDoc(doc(db,"exam_attempts", attemptId));
  if (!aSnap.exists()) return location.href="admin_exam.html";
  attempt = aSnap.data();

  const eSnap = await getDoc(doc(db,"exams", attempt.examId));
  if (!eSnap.exists()) return location.href="admin_exam.html";
  exam = eSnap.data();

  adminNoteEl.value = attempt.adminNote || "";

  renderInfo();
  renderQuestions();
  renderScores(); // initial
}

function renderInfo(){
  infoBox.innerHTML = `
    <p><b>الاسم:</b> ${attempt.employeeName || "—"}</p>
    <p><b>الرقم الوظيفي:</b> ${attempt.employeeId || "—"}</p>
    <p><b>القسم:</b> ${attempt.section || "—"}</p>
    <p><b>اسم الامتحان:</b> ${attempt.examTitle || exam.title || "—"}</p>
    <p><b>الحالة:</b> ${attempt.status || "—"}</p>
  `;
}

/* Render Questions (جلب أحدث exam.questions + قسم الموظف) */
function renderQuestions(){
  questionsBox.innerHTML = "";

  autoRaw = 0;
  manualRaw = 0;
  maxRaw = 0;

  const section = String(attempt.section || "").trim();
  const all = (exam.questions || []).map(normalizeQuestion);

  const qs = section ? all.filter(q => String(q.section||"").trim() === section) : all;

  if (!qs.length){
    questionsBox.innerHTML = `<div style="padding:12px;border:1px dashed #cbd5e1;border-radius:14px;color:#64748b;background:#f8fafc">
      ⚠️ لا توجد أسئلة لهذا القسم داخل الامتحان
    </div>`;
    autoScoreEl.textContent = "0";
    manualScoreEl.textContent = "0";
    totalScoreEl.textContent = "0";
    return;
  }

  const savedManual = attempt.manualGrades || {}; // { [qid]: number }

  qs.forEach((q, i)=>{
    const ans = attempt.answers?.[q.id] ?? "";
    const max = Math.max(1, num(q.points,1));
    maxRaw += max;

    const isManual = q.correctionMode === "manual";

    let earnedAuto = 0;
    let correct = false;

    if (!isManual){
      if (q.type === "tf"){
        const a = parseTF(ans);
        const c = parseTF(q.correctAnswer);
        if (a !== null && c !== null && a === c){ earnedAuto = max; correct = true; }
        else if (sameText(ans, q.correctAnswer)){ earnedAuto = max; correct = true; }
      } else if (q.type === "mcq"){
        if (sameText(ans, q.correctAnswer)){ earnedAuto = max; correct = true; }
      } else {
        if (q.correctAnswer && sameText(ans, q.correctAnswer)){ earnedAuto = max; correct = true; }
      }
      autoRaw += earnedAuto;
    }

    const card = document.createElement("div");
    card.className = `question ${isManual ? "manual" : (correct ? "correct" : "wrong")}`;
    card.dataset.qid = q.id;

    card.innerHTML = `
      <div class="q-head">
        <div class="q-title">${i+1}. ${q.title || "—"}</div>
        <div class="q-badges">
          <span class="badge">${q.type}</span>
          ${
            isManual
              ? `<span class="badge man">يدوي</span>`
              : (correct ? `<span class="badge ok">صح</span>` : `<span class="badge no">خطأ</span>`)
          }
          <span class="badge">الدرجة: ${max}</span>
        </div>
      </div>

      <div class="q-body">
        <p><b>جواب الموظف:</b> ${q.type === "tf" ? formatTF(ans) : (ans || "—")}</p>
        <p><b>الإجابة الصحيحة:</b> ${q.correctAnswer ? (q.type==="tf" ? formatTF(q.correctAnswer) : q.correctAnswer) : "—"}</p>
        <p><b>درجة السؤال:</b> ${isManual ? `— / ${max}` : `${earnedAuto} / ${max}`}</p>
      </div>
    `;

    if (isManual){
      const row = document.createElement("div");
      row.className = "manual-row";
      row.innerHTML = `
        <span class="manual-label">درجة يدوية:</span>
        <input class="manual-input" type="number" min="0" max="${max}"
          value="${num(savedManual[q.id], 0)}" data-max="${max}">
      `;
      card.appendChild(row);
    }

    questionsBox.appendChild(card);
  });
}

/* Scores UI */
function renderScores(){
  // manual from inputs
  manualRaw = 0;
  document.querySelectorAll(".manual-input").forEach(inp=>{
    const mx = Math.max(1, num(inp.dataset.max, 1));
    let v = num(inp.value, 0);
    v = Math.min(Math.max(v, 0), mx);
    manualRaw += v;
  });

  const earnedRaw = autoRaw + manualRaw;
  const autoPercent = maxRaw ? Math.round((autoRaw / maxRaw) * 100) : 0;
  const manualPercent = maxRaw ? Math.round((manualRaw / maxRaw) * 100) : 0;
  const totalPercent = maxRaw ? Math.min(100, Math.round((earnedRaw / maxRaw) * 100)) : 0;

  autoScoreEl.textContent = String(autoPercent);
  manualScoreEl.textContent = String(manualPercent);
  totalScoreEl.textContent = String(totalPercent);

  return { autoPercent, manualPercent, totalPercent, earnedRaw };
}

document.addEventListener("input", (e)=>{
  if (e.target.classList && e.target.classList.contains("manual-input")){
    renderScores();
  }
});

/* Finalize + save */
btnFinalize.onclick = async ()=>{
  // collect manual grades
  const manualGrades = {};
  manualRaw = 0;

  document.querySelectorAll(".question.manual").forEach(card=>{
    const qid = card.dataset.qid;
    const inp = card.querySelector(".manual-input");
    const mx = Math.max(1, num(inp.dataset.max, 1));
    let v = num(inp.value, 0);
    v = Math.min(Math.max(v, 0), mx);
    inp.value = v;
    manualGrades[qid] = v;
    manualRaw += v;
  });

  const earnedRaw = autoRaw + manualRaw;

  const autoScore = maxRaw ? Math.round((autoRaw / maxRaw) * 100) : 0;
  const manualScore = maxRaw ? Math.round((manualRaw / maxRaw) * 100) : 0;
  const totalScore = maxRaw ? Math.min(100, Math.round((earnedRaw / maxRaw) * 100)) : 0;

  await updateDoc(doc(db,"exam_attempts", attemptId),{
    autoRaw,
    manualRaw,
    maxRaw,
    earnedRaw,
    autoScore,
    manualScore,
    totalScore,
    manualGrades,
    adminNote: (adminNoteEl.value || "").trim(),
    status: "finalized",
    reviewedBy: currentEmail,
    finalizedAt: serverTimestamp(),
    passScore: exam.passScore ?? 60
  });

  // Animation + redirect
  finishOverlay.style.display = "flex";
  setTimeout(()=> location.href="admin_exam.html", 1600);
};

/* Export Excel (حقيقي) */
btnExcel.onclick = ()=>{
  const rows = [];
  const section = String(attempt.section||"").trim();
  const all = (exam.questions || []).map(normalizeQuestion);
  const qs = section ? all.filter(q => String(q.section||"").trim() === section) : all;

  const savedManual = attempt.manualGrades || {};
  // NOTE: if you want latest values (before finalize), read from inputs
  const liveManual = {};
  document.querySelectorAll(".question.manual").forEach(card=>{
    const qid = card.dataset.qid;
    const inp = card.querySelector(".manual-input");
    liveManual[qid] = num(inp.value, 0);
  });

  qs.forEach((q, i)=>{
    const ans = attempt.answers?.[q.id] ?? "";
    const max = Math.max(1, num(q.points,1));
    const isManual = q.correctionMode === "manual";
    const manualVal = isManual ? num(liveManual[q.id] ?? savedManual[q.id], 0) : 0;

    rows.push({
      رقم: i+1,
      السؤال: q.title || "",
      النوع: q.type,
      القسم: q.section,
      درجة_السؤال: max,
      جواب_الموظف: q.type==="tf" ? formatTF(ans) : (ans||""),
      الإجابة_الصحيحة: q.correctAnswer ? (q.type==="tf"?formatTF(q.correctAnswer):q.correctAnswer) : "",
      التصحيح: isManual ? "يدوي" : "تلقائي",
      درجة_يدوية: manualVal
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attempt");
  XLSX.writeFile(wb, `Attempt_${attempt.employeeId||"employee"}.xlsx`);
};

/* Export PDF (حقيقي) */
btnPDF.onclick = ()=>{
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  const name = attempt.employeeName || "—";
  const emp = attempt.employeeId || "—";
  const sec = attempt.section || "—";
  const examTitle = attempt.examTitle || exam.title || "—";

  const scores = renderScores();

  pdf.setFontSize(14);
  pdf.text("Exam Attempt Report", 105, 14, { align:"center" });

  pdf.setFontSize(11);
  pdf.text(`Name: ${name}`, 14, 24);
  pdf.text(`Employee ID: ${emp}`, 14, 30);
  pdf.text(`Section: ${sec}`, 14, 36);
  pdf.text(`Exam: ${examTitle}`, 14, 42);

  pdf.text(`Auto: ${scores.autoPercent}/100`, 14, 52);
  pdf.text(`Manual: ${scores.manualPercent}/100`, 14, 58);
  pdf.text(`Total: ${scores.totalPercent}/100`, 14, 64);

  const section = String(attempt.section||"").trim();
  const all = (exam.questions || []).map(normalizeQuestion);
  const qs = section ? all.filter(q => String(q.section||"").trim() === section) : all;

  const liveManual = {};
  document.querySelectorAll(".question.manual").forEach(card=>{
    const qid = card.dataset.qid;
    const inp = card.querySelector(".manual-input");
    liveManual[qid] = num(inp.value, 0);
  });

  const body = qs.map((q, i)=>{
    const ans = attempt.answers?.[q.id] ?? "";
    const max = Math.max(1, num(q.points,1));
    const isManual = q.correctionMode === "manual";
    const m = isManual ? String(num(liveManual[q.id], 0)) : "-";
    return [
      String(i+1),
      q.title || "",
      q.type,
      isManual ? "Manual" : "Auto",
      q.type==="tf" ? formatTF(ans) : (ans||"—"),
      q.correctAnswer ? (q.type==="tf"?formatTF(q.correctAnswer):q.correctAnswer) : "—",
      `${max}`,
      m
    ];
  });

  pdf.autoTable({
    startY: 72,
    head: [["#","Question","Type","Mode","Employee Answer","Correct Answer","Pts","Manual"]],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 56, 168] }
  });

  const note = (adminNoteEl.value || "").trim();
  if (note){
    const y = pdf.lastAutoTable.finalY + 10;
    pdf.setFontSize(11);
    pdf.text("Admin Note:", 14, y);
    pdf.setFontSize(10);
    pdf.text(note.substring(0, 500), 14, y + 6);
  }

  pdf.save(`Attempt_${emp}.pdf`);
};

loadData();
