// ===========================================
// KPI PRODUCTIVITY – LOCAL STORAGE VERSION
// Developed by Jawad Kadhim
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
const kpiTitleInput = document.getElementById("kpiTitle");

/* =====================
   EDIT MODE (IF EXISTS)
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
    alert("❌ You do not have permission");
    return;
  }

  const reports = JSON.parse(localStorage.getItem("kpi_reports") || "[]");
  const reportId = editReportId || "kpi_" + Date.now();

  const report = {
    id: reportId,
    title: kpiTitleInput.value || "",
    month: monthSelect.value,
    createdBy: currentEmail,
    createdAt: new Date().toISOString(),
    rows: []
  };

  document.querySelectorAll("#kpiTable tbody tr").forEach(row => {

    report.rows.push({
      id: row.dataset.id,

      kpi: row.querySelector(".kpi-name")?.value || "",
      desc: row.querySelector(".kpi-desc")?.value || "",
      measure: row.querySelector(".kpi-measure")?.value || "",

      iw: row.querySelector(".iw")?.value || "",
      uw: row.querySelector(".uw")?.value || "",
      input: row.querySelector(".input")?.value || "",
      output: row.querySelector(".output")?.value || "",
      sla: row.querySelector(".sla")?.value || "",
      note: row.querySelector(".note")?.value || ""
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

  alert("✔ KPI Report saved successfully");

  window.location.href = "kpi_reports.html";
};

/* =====================
   LOAD REPORT FOR EDIT
===================== */
function loadReportForEdit(id) {
  const reports = JSON.parse(localStorage.getItem("kpi_reports") || "[]");
  const report = reports.find(r => r.id === id);
  if (!report) return;

  monthSelect.value = report.month || "";
  kpiTitleInput.value = report.title || "";

  report.rows.forEach(r => {
    const row = document.querySelector(`tr[data-id="${r.id}"]`);
    if (!row) return;

    row.querySelector(".kpi-name").value = r.kpi || "";
    row.querySelector(".kpi-desc").value = r.desc || "";
    row.querySelector(".kpi-measure").value = r.measure || "";

    row.querySelector(".iw").value = r.iw || "";
    row.querySelector(".uw").value = r.uw || "";
    row.querySelector(".input").value = r.input || "";
    row.querySelector(".output").value = r.output || "";
    row.querySelector(".sla").value = r.sla || "";
    row.querySelector(".note").value = r.note || "";
  });
}

/* =====================
   EXPORT PDF
===================== */
window.exportPDF = function () {
  const element = document.getElementById("kpiTable");

  html2pdf()
    .set({
      margin: 0.5,
      filename: "KPI_Report.pdf",
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "landscape" }
    })
    .from(element)
    .save();
};

/* =====================
   EXPORT EXCEL
===================== */
window.exportExcel = function () {
  const tableHTML = document.getElementById("kpiTable").outerHTML;

  const blob = new Blob(
    [`<html><head><meta charset="UTF-8"></head><body>${tableHTML}</body></html>`],
    { type: "application/vnd.ms-excel" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "KPI_Report.xls";
  a.click();
};
