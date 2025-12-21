import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Admin Guard
=============================== */
const email = localStorage.getItem("kb_user_email");
const userSnap = await getDoc(doc(db,"users",email));
if (!userSnap.exists() || userSnap.data().role !== "admin") {
  alert("غير مخول");
  location.href="dashboard.html";
}

/* ===============================
   UI
=============================== */
const tbody = document.getElementById("tbody");
const btnExcel = document.getElementById("btnExcel");
const btnPDF   = document.getElementById("btnPDF");
const btnClear = document.getElementById("btnClear");

let cache = [];

/* ===============================
   Load Attempts
=============================== */
async function loadAttempts() {
  const snap = await getDocs(collection(db,"exam_attempts"));
  tbody.innerHTML = "";
  cache = [];

  snap.forEach(d => {
    const a = d.data();
    const score = (a.autoScore||0)+(a.manualScore||0);

    cache.push({
      الاسم: a.employeeName || "",
      الرقم_الوظيفي: a.employeeId || "",
      النتيجة: score
    });

    tbody.innerHTML += `
      <tr>
        <td>${a.employeeName||"—"}</td>
        <td>${a.employeeId||"—"}</td>
        <td>${a.email||"—"}</td>
        <td>${a.status||"—"}</td>
        <td>${a.violations||0}</td>
        <td>${score}</td>
        <td><button class="view-btn">عرض</button></td>
      </tr>
    `;
  });
}

/* ===============================
   Excel
=============================== */
btnExcel.onclick = () => {
  const ws = XLSX.utils.json_to_sheet(cache);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "Exam_Results.xlsx");
};

/* ===============================
   PDF
=============================== */
btnPDF.onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text("نتائج الامتحان", 105, 10, {align:"center"});
  pdf.autoTable({
    head:[["الاسم","الرقم الوظيفي","النتيجة"]],
    body: cache.map(x=>[x.الاسم,x.الرقم_الوظيفي,x.النتيجة]),
    startY:20
  });
  pdf.save("Exam_Results.pdf");
};

/* ===============================
   Delete All Attempts
=============================== */
btnClear.onclick = async () => {
  if (!confirm("⚠️ سيتم اعلان الامتحان فارغ، هل أنت متأكد؟")) return;

  const snap = await getDocs(collection(db,"exam_attempts"));
  for (const d of snap.docs) {
    await deleteDoc(doc(db,"exam_attempts",d.id));
  }

  alert("✅ تم حذف جميع المحاولات");
  loadAttempts();
};

/* ===============================
   Init
=============================== */
loadAttempts();
