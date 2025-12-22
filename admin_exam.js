import { db } from "./firebase.js";
import {
  collection, getDocs, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {

  /* ===============================
     Admin Guard
  =============================== */
  const currentEmail = localStorage.getItem("kb_user_email") || "";
  if (!currentEmail) return location.href = "login.html";

  const userSnap = await getDoc(doc(db, "users", currentEmail));
  const isAdmin =
    userSnap.exists() &&
    String(userSnap.data().role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    alert("غير مخول");
    return location.href = "dashboard.html";
  }

  /* ===============================
     Elements
  =============================== */
  const tbody = document.getElementById("tbody");
  const btnExcel = document.getElementById("btnExcel");
  const btnPDF = document.getElementById("btnPDF");
  const btnClear = document.getElementById("btnClear");
  const searchInput = document.getElementById("searchInput");
  const hint = document.getElementById("hint");

  if (!btnClear) {
    console.error("❌ btnClear not found in DOM");
    return;
  }

  let cache = [];

  /* ===============================
     Load Results
  =============================== */
async function loadResults() {
  const snap = await getDocs(collection(db, "exam_attempts"));
  tbody.innerHTML = "";
  cache = [];

  const rows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => ["submitted", "finalized"].includes(r.status));

  hint.textContent = `عدد المحاولات: ${rows.length}`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8">لا توجد محاولات</td></tr>`;
    return;
  }

  rows
    .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
    .forEach(r => {

 const PASS_MARK = 50;
const pass = (Number(r.totalScore) || 0) >= PASS_MARK;


      const reviewLabel =
        r.status === "finalized" ? "مصحح" : "بانتظار التصحيح";

      const reviewClass =
        r.status === "finalized" ? "status-reviewed" : "status-pending";

      cache.push({
        الاسم: r.employeeName || "—",
        الرقم_الوظيفي: r.employeeId || "—",
        القسم: r.section || "—",
        الدرجة: r.totalScore || 0,
        الحالة: pass ? "ناجح" : "راسب",
      });

      tbody.innerHTML += `
        <tr>
          <td>${r.employeeName || "—"}</td>
          <td>${r.employeeId || "—"}</td>
          <td>${r.section || "—"}</td>
          <td>${r.totalScore || 0} / 100</td>

          <td class="${pass ? "status-success" : "status-fail"}">
            ${pass ? "ناجح" : "راسب"}
          </td>

          <td class="${reviewClass}">
            ${reviewLabel}
          </td>

          <td>
            <input class="note-input"
              value="${r.adminNote || ""}"
              placeholder="ملاحظة..."
              onchange="saveNote('${r.id}', this.value)">
          </td>

          <td>
            <button class="view-btn"
              onclick="openAttempt('${r.id}')">
              عرض التفاصيل
            </button>
          </td>
        </tr>
      `;
    });
}


  /* ===============================
     Search
  =============================== */
  searchInput.oninput = () => {
    const q = (searchInput.value || "").toLowerCase();
    document.querySelectorAll("#tbody tr").forEach(tr => {
      tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  };

  /* ===============================
     Save Note
  =============================== */
  window.saveNote = async (id, val) => {
    await updateDoc(doc(db, "exam_attempts", id), { adminNote: val });
  };

  /* ===============================
     Export Excel
  =============================== */
  btnExcel.onclick = () => {
    const ws = XLSX.utils.json_to_sheet(cache);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "Exam_Results.xlsx");
  };

  /* ===============================
     Export PDF
  =============================== */
  btnPDF.onclick = () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.text("تقارير النتائج", 105, 15, { align: "center" });

    pdf.autoTable({
      startY: 25,
      head: [["الاسم", "الرقم", "القسم", "الدرجة", "الحالة", "ملاحظة"]],
      body: cache.map(r => [
        r.الاسم,
        r.الرقم_الوظيفي,
        r.القسم,
        String(r.الدرجة),
        r.الحالة,
        r.ملاحظة
      ])
    });

    pdf.save("Exam_Results.pdf");
  };

  /* ===============================
     Clear Finalized Results ✅ FIXED
  =============================== */
  btnClear.onclick = async () => {
    const ok = confirm("⚠️ هل تريد حذف جميع النتائج المكتملة (finalized)؟");
    if (!ok) return;

    btnClear.disabled = true;
    btnClear.innerText = "⏳ جاري الحذف...";

    const snap = await getDocs(collection(db, "exam_attempts"));
    let count = 0;

    for (const d of snap.docs) {
      if (d.data().status === "finalized") {
        await deleteDoc(doc(db, "exam_attempts", d.id));
        count++;
      }
    }

    alert(`✅ تم حذف ${count} نتيجة مكتملة`);
    btnClear.disabled = false;
    btnClear.innerText = "🗑️ حذف النتائج المكتملة";

    loadResults();
  };

  /* ===============================
     Navigation
  =============================== */
  window.openAttempt = (id) => {
    localStorage.setItem("admin_selected_attempt", id);
    location.href = "admin_attempt.html";
  };

  /* ===============================
     Start
  =============================== */
  loadResults();
});
