// kpi_productivity.js (LOCAL STORAGE VERSION)
// ===========================================

/* =====================
   STATE
===================== */
let isAdmin = true; // نفس منطقك الحالي
let currentEmail = localStorage.getItem("kb_user_email") || "unknown";

/* =====================
   ELEMENTS
===================== */
const monthSelect = document.getElementById("monthSelect");

/* =====================
   LOAD FOR EDIT (IF EXISTS)
===================== */
const editReportId = localStorage.getItem("edit_kpi_report");

if (editReportId) {
  loadReportForEdit(editReportId);
}

/* =====================
   SAVE REPORT
===================== */
window.saveReport = function () {

  if (!isAdmin) {
    alert("No permission");
    return;
  }

  const reports = JSON.parse(localStorage.getItem("kpi_reports") || "[]");

  const reportId = editReportId || "kpi_" + Date.now();

  const report = {
    id: reportId,
    month: monthSelect.value,
    createdBy: currentEmail,
    createdAt: new Date().toISOString(),
    rows: []
  };

  document.querySelectorAll("tbody tr").forEach(row => {
    report.rows.push({
      id: row.dataset.id,
      iw: row.querySelector(".iw").value,
      uw: row.querySelector(".uw").value,
      input: row.querySelector(".input").value,
      output: row.querySelector(".output").value,
      sla: row.querySelector(".sla").value,
      note: row.querySelector(".note").value
    });
  });

  const index = reports.findIndex(r => r.id === reportId);
  if (index >= 0) {
    reports[index] = report; // update
  } else {
    reports.push(report); // new
  }

  localStorage.setItem("kpi_reports", JSON.stringify(reports));
  localStorage.removeItem("edit_kpi_report");

  alert("✔ Report saved locally");

  window.location.href = "kpi_reports.html";
};

/* =====================
   LOAD REPORT FOR EDIT
===================== */
function loadReportForEdit(id) {
  const reports = JSON.parse(localStorage.getItem("kpi_reports") || "[]");
  const report = reports.find(r => r.id === id);
  if (!report) return;

  monthSelect.value = report.month;

  report.rows.forEach(r => {
    const row = document.querySelector(`tr[data-id="${r.id}"]`);
    if (!row) return;

    row.querySelector(".iw").value = r.iw;
    row.querySelector(".uw").value = r.uw;
    row.querySelector(".input").value = r.input;
    row.querySelector(".output").value = r.output;
    row.querySelector(".sla").value = r.sla;
    row.querySelector(".note").value = r.note;
  });
}

/* =====================
   EXPORT (OPTIONAL)
===================== */
window.exportPDF = function () {
  html2pdf().from(document.getElementById("kpiTable")).save("KPI_Report.pdf");
};

window.exportExcel = function () {
  const table = document.getElementById("kpiTable").outerHTML;
  const blob = new Blob(
    [`<html><body>${table}</body></html>`],
    { type: "application/vnd.ms-excel" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "KPI_Report.xls";
  a.click();
};
