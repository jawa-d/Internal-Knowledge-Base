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
const userSnap = await getDoc(doc(db, "users", email));

if (!userSnap.exists() || userSnap.data().role !== "admin") {
  alert("غير مخول");
  location.href = "dashboard.html";
}

/* ===============================
   UI
=============================== */
const tbody = document.getElementById("tbody");
const btnExcel = document.getElementById("btnExcel");
const btnPDF   = document.getElementById("btnPDF");
const btnClear = document.getElementById("btnClear");

let cache = [];
const PASS_SCORE = 50; // ✅ 50 وفوك ناجح

/* ===============================
   Load Attempts
=============================== */
async function loadAttempts() {
  const snap = await getDocs(collection(db, "exam_attempts"));
  tbody.innerHTML = "";
  cache = [];

  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="9">لا توجد محاولات</td></tr>`;
    return;
  }

  snap.forEach(d => {
    const a = d.data();
    const total = Number(a.totalScore || 0);
    const passed = total >= PASS_SCORE;

    cache.push({
      الاسم: a.employeeName,
      الرقم_الوظيفي: a.employeeId,
      الايميل: a.email,
      الدرجة: total,
      النتيجة: passed ? "ناجح" : "راسب",
      الحالة: a.status
    });

    tbody.innerHTML += `
      <tr>
        <td>${a.employeeName}</td>
        <td>${a.employeeId}</td>
        <td>${a.email}</td>
        <td>${a.status}</td>
        <td>${a.violations || 0}</td>
        <td>${total} / 100</td>
        <td>
          ${passed
            ? '<span style="color:green;font-weight:700">🟢 ناجح</span>'
            : '<span style="color:red;font-weight:700">🔴 راسب</span>'
          }
        </td>
        <td>
          <button class="view-btn"
            onclick="openAttempt('${d.id}')">
            عرض التفاصيل
          </button>
        </td>
      </tr>
    `;
  });
}

/* ===============================
   Navigation
=============================== */
window.openAttempt = function (id) {
  localStorage.setItem("admin_selected_attempt", id);
  location.href = "admin_attempt.html";
};

/* ===============================
   Export Excel
=============================== */
btnExcel.onclick = () => {
  const ws = XLSX.utils.json_to_sheet(cache);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "Earthlink_Exam_Results.xlsx");
};

/* ===============================
   Export PDF
=============================== */
btnPDF.onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  pdf.setFontSize(16);
  pdf.text("EARTHLINK TELECOMMUNICATIONS", 105, 15, { align: "center" });
  pdf.setFontSize(12);
  pdf.text("Exam Results Report", 105, 23, { align: "center" });

  pdf.autoTable({
    startY: 30,
    head: [["الاسم", "الرقم الوظيفي", "الدرجة", "النتيجة"]],
    body: cache.map(r => [
      r.الاسم,
      r.الرقم_الوظيفي,
      r.الدرجة,
      r.النتيجة
    ])
  });

  pdf.save("Earthlink_Exam_Report.pdf");
};

/* ===============================
   Delete All
=============================== */
btnClear.onclick = async () => {
  if (!confirm("⚠️ حذف جميع المحاولات؟")) return;

  const snap = await getDocs(collection(db, "exam_attempts"));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "exam_attempts", d.id));
  }

  alert("تم الحذف");
  loadAttempts();
};

/* ===============================
   Start
=============================== */
loadAttempts();
