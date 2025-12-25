import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { checkAccess } from "./security.js";

document.addEventListener("DOMContentLoaded", async () => {
  const allowed = await checkAccess(["admin"]);
  if (!allowed) return;

  // 👇 كود الصفحة الطبيعي هنا
});

const monthSelect = document.getElementById("monthSelect");
const kpiTitleInput = document.getElementById("kpiTitle");

const editId = localStorage.getItem("edit_kpi_id");

/* ===============================
   Load For Edit (Firestore)
================================ */
if (editId) {
  loadForEdit(editId);
}

async function loadForEdit(id) {
  const snap = await getDoc(doc(db, "kpi_reports", id));
  if (!snap.exists()) return;

  const data = snap.data();

  kpiTitleInput.value = data.title || "";
  monthSelect.value = data.month;

  data.rows.forEach((r, i) => {
    const row = document.querySelectorAll("#kpiTable tbody tr")[i];
    if (!row) return;

    row.querySelector(".kpi-name").value = r.kpi;
    row.querySelector(".kpi-desc").value = r.desc;
    row.querySelector(".kpi-measure").value = r.measure;
    row.querySelector(".note").value = r.note;
    row.querySelector(".iw").value = r.iw;
    row.querySelector(".uw").value = r.uw;
    row.querySelector(".input").value = r.input;
    row.querySelector(".output").value = r.output;
    row.querySelector(".sla").value = r.sla;
  });
}

/* ===============================
   Save / Update KPI (Firestore)
================================ */
window.saveReport = async function () {

  const rows = [];

  document.querySelectorAll("#kpiTable tbody tr").forEach(row => {
    const kpi = row.querySelector(".kpi-name").value;
    if (!kpi) return;

    rows.push({
      kpi,
      desc: row.querySelector(".kpi-desc").value,
      measure: row.querySelector(".kpi-measure").value,
      note: row.querySelector(".note").value,
      iw: row.querySelector(".iw").value,
      uw: row.querySelector(".uw").value,
      input: row.querySelector(".input").value,
      output: row.querySelector(".output").value,
      sla: row.querySelector(".sla").value
    });
  });

  if (!rows.length) {
    alert("❌ Add at least one KPI");
    return;
  }

  if (editId) {
    await updateDoc(doc(db, "kpi_reports", editId), {
      title: kpiTitleInput.value || "",
      month: monthSelect.value,
      rows
    });

    localStorage.removeItem("edit_kpi_id");
    alert("✔ KPI updated");
  } else {
    await addDoc(collection(db, "kpi_reports"), {
      title: kpiTitleInput.value || "",
      month: monthSelect.value,
      createdAt: serverTimestamp(),
      rows
    });

    alert("✔ KPI saved");
  }

  location.href = "kpi_reports.html";
};

/* ===============================
   PDF
================================ */
window.exportPDF = function () {
  html2pdf().from(document.getElementById("kpiTable")).save("KPI_Report.pdf");
};

/* ===============================
   Excel
================================ */
window.exportExcel = function () {
  const tableHTML = document.getElementById("kpiTable").outerHTML;
  const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "KPI_Report.xls";
  a.click();
};
