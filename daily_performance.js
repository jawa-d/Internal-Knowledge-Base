import { checkAccess } from "./security.js";
import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* =========================
   CONFIG
========================= */
const MOCK_MODE = true; // غيرها لاحقاً إلى false عند ربط API الحقيقي

/* =========================
   MOCK DATA
========================= */
const MOCK_ROWS = [
  { ID:"10742", Name:"Jawad Kadhim", Date:"2026-01-01", "AVG Daily evaluation":88, Attendance:1, Calls:32 },
  { ID:"10742", Name:"Jawad Kadhim", Date:"2026-01-02", "AVG Daily evaluation":92, Attendance:1, Calls:41 },
  { ID:"10742", Name:"Jawad Kadhim", Date:"2026-01-03", "AVG Daily evaluation":75, Attendance:1, Calls:20 },
  { ID:"10742", Name:"Jawad Kadhim", Date:"2026-01-05", "AVG Daily evaluation":80, Attendance:1, Calls:28 },

  { ID:"11015", Name:"Zena Majid", Date:"2026-01-01", "AVG Daily evaluation":95, Attendance:1, Calls:50 },
  { ID:"11015", Name:"Zena Majid", Date:"2026-01-02", "AVG Daily evaluation":90, Attendance:1, Calls:45 }
];

/* =========================
   Column Mapping
========================= */
const MAP = {
  empId: ["ID", "EmpID", "EmployeeID"],
  name: ["Name", "EmployeeName", "FullName"],
  date: ["Date", "Day", "RecordDate", "date"],
  evaluation: ["AVG Daily evaluation", "AvgDailyEvaluation", "Evaluation", "AVG", "avg"],
  attendance: ["Attendance", "attendance"],
  calls: ["Calls", "calls", "TotalCalls", "CallCount"]
};

/* =========================
   Elements
========================= */
const btnApiSettings = document.getElementById("btnApiSettings");
const apiUrlText = document.getElementById("apiUrlText");

const empIdEl = document.getElementById("empId");
const dateFromEl = document.getElementById("dateFrom");
const dateToEl = document.getElementById("dateTo");

const btnSearch = document.getElementById("btnSearch");
const btnClear = document.getElementById("btnClear");

const tbody = document.getElementById("tbody");

const kpiAvg = document.getElementById("kpiAvg");
const kpiAvgHint = document.getElementById("kpiAvgHint");
const kpiMax = document.getElementById("kpiMax");
const kpiMaxHint = document.getElementById("kpiMaxHint");
const kpiMin = document.getElementById("kpiMin");
const kpiMinHint = document.getElementById("kpiMinHint");
const kpiCalls = document.getElementById("kpiCalls");
const kpiCallsHint = document.getElementById("kpiCallsHint");

const analysisGrid = document.getElementById("analysisGrid");

/* Modal */
const apiModal = document.getElementById("apiModal");
const btnCloseModal = document.getElementById("btnCloseModal");
const apiMonthEl = document.getElementById("apiMonth");
const apiUrlEl = document.getElementById("apiUrl");
const btnSaveApi = document.getElementById("btnSaveApi");
const btnDeleteApi = document.getElementById("btnDeleteApi");

/* =========================
   State
========================= */
let currentUserRole = "user";
let apiConfig = {}; // { "2026-01": "https://..." }

/* =========================
   Firestore doc
========================= */
const SETTINGS_DOC = doc(db, "kb_settings", "daily_performance_apis");

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  const allowed = await checkAccess(["admin", "user", "viewer"]);
  if (!allowed) return;

  currentUserRole = localStorage.getItem("kb_user_role") || "user";

  // إظهار إعدادات API فقط للأدمن
  if (currentUserRole === "admin") {
    btnApiSettings.style.display = "inline-flex";
    apiModal.style.display = "flex";
  } else {
    btnApiSettings.style.display = "none";
    apiModal.style.display = "none";
  }

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  dateFromEl.value = toISO(first);
  dateToEl.value = toISO(last);

  await loadApiConfig();
  refreshCurrentApiBadge();

  btnSearch.addEventListener("click", onSearch);
  btnClear.addEventListener("click", onClear);

  btnApiSettings.addEventListener("click", () => apiModal.classList.add("open"));
  btnCloseModal.addEventListener("click", () => apiModal.classList.remove("open"));

  btnSaveApi.addEventListener("click", saveApiForMonth);
  btnDeleteApi.addEventListener("click", deleteApiForMonth);
});

/* =========================
   API CONFIG
========================= */
async function loadApiConfig() {
  try {
    const snap = await getDoc(SETTINGS_DOC);
    apiConfig = snap.exists() ? (snap.data().months || {}) : {};
  } catch (e) {
    apiConfig = {};
    console.error(e);
  }
}

function refreshCurrentApiBadge() {
  apiUrlText.textContent = MOCK_MODE ? "MOCK MODE" : "API ACTIVE";
}

async function saveApiForMonth() {
  if (currentUserRole !== "admin") return;

  const month = apiMonthEl.value;
  const url = (apiUrlEl.value || "").trim();

  if (!month || !url) return alert("أكمل البيانات");

  const newMonths = { ...(apiConfig || {}), [month]: url };
  await setDoc(SETTINGS_DOC, { months: newMonths }, { merge: true });
  apiConfig = newMonths;
  alert("تم حفظ API");
}

async function deleteApiForMonth() {
  if (currentUserRole !== "admin") return;

  const month = apiMonthEl.value;
  if (!month) return alert("حدد الشهر");

  const copy = { ...(apiConfig || {}) };
  delete copy[month];

  await setDoc(SETTINGS_DOC, { months: copy }, { merge: true });
  apiConfig = copy;
  alert("تم الحذف");
}

/* =========================
   SEARCH
========================= */
async function onSearch() {
  const empId = empIdEl.value.trim();
  const from = dateFromEl.value;
  const to = dateToEl.value;

  if (!empId || !from || !to) return alert("أكمل البيانات");

  const rows = await fetchRows();

  const empRows = rows.filter(r => String(r.ID) === empId);

  const days = enumerateDays(from, to);
  const daily = days.map(d => {
    const list = empRows.filter(r => r.Date === d);
    return { date: d, list };
  });

  renderTable(daily, empId);

  const calc = calculateKPIs(daily);
  renderKPIs(calc);
  renderNumericAnalysis(calc.numericColumns);
}

function onClear() {
  empIdEl.value = "";
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted)">ابدأ بالبحث…</td></tr>`;
  kpiAvg.textContent = "—";
  kpiMax.textContent = "—";
  kpiMin.textContent = "—";
  kpiCalls.textContent = "—";
  analysisGrid.innerHTML = `<div class="empty-card">سيظهر التحليل بعد البحث…</div>`;
}

/* =========================
   FETCH
========================= */
async function fetchRows() {
  if (MOCK_MODE) {
    return new Promise(res => setTimeout(() => res(MOCK_ROWS), 300));
  }
  return [];
}

/* =========================
   RENDER
========================= */
function renderTable(daily, empId) {
  const html = [];

  for (const day of daily) {
    if (!day.list.length) {
      html.push(`
        <tr>
          <td>${day.date}</td>
          <td>—</td>
          <td>${empId}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>لا توجد تقييمات</td>
        </tr>
      `);
      continue;
    }

    const r = day.list[0];

    html.push(`
      <tr>
        <td>${day.date}</td>
        <td>${r.Name}</td>
        <td>${r.ID}</td>
        <td>${r["AVG Daily evaluation"]}</td>
        <td>${r.Attendance}</td>
        <td>${r.Calls}</td>
        <td>${r["AVG Daily evaluation"] >= 90 ? "🔥 ممتاز" : "⚠️ يحتاج تحسين"}</td>
      </tr>
    `);
  }

  tbody.innerHTML = html.join("");
}

/* =========================
   KPI
========================= */
function calculateKPIs(daily) {
  const vals = daily.flatMap(d => d.list.map(r => r["AVG Daily evaluation"])).filter(Boolean);
  const calls = daily.flatMap(d => d.list.map(r => r.Calls)).filter(Boolean);

  return {
    avg: mean(vals),
    max: Math.max(...vals),
    min: Math.min(...vals),
    callsMax: Math.max(...calls),
    callsMin: Math.min(...calls),
    numericColumns: [
      { key: "AVG Daily evaluation", avg: mean(vals), max: Math.max(...vals), min: Math.min(...vals), count: vals.length },
      { key: "Calls", avg: mean(calls), max: Math.max(...calls), min: Math.min(...calls), count: calls.length }
    ]
  };
}

function renderKPIs(c) {
  kpiAvg.textContent = c.avg ? c.avg.toFixed(2) : "—";
  kpiMax.textContent = c.max || "—";
  kpiMin.textContent = c.min || "—";
  kpiCalls.textContent = c.callsMax || "—";

  kpiAvgHint.textContent = "متوسط الفترة";
  kpiMaxHint.textContent = "أعلى قيمة";
  kpiMinHint.textContent = "أدنى قيمة";
  kpiCallsHint.textContent = "أعلى مكالمات";
}

/* =========================
   ANALYSIS
========================= */
function renderNumericAnalysis(cols) {
  if (!cols || !cols.length) {
    analysisGrid.innerHTML = `<div class="empty-card">لا يوجد تحليل</div>`;
    return;
  }

  analysisGrid.innerHTML = cols.map(c => `
    <div class="ana">
      <h4>${c.key}</h4>
      <div>AVG: ${c.avg.toFixed(2)}</div>
      <div>MAX: ${c.max}</div>
      <div>MIN: ${c.min}</div>
      <div>Count: ${c.count}</div>
    </div>
  `).join("");
}

/* =========================
   HELPERS
========================= */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function toISO(d) {
  const pad = x => String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function enumerateDays(from, to) {
  const out = [];
  let d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    out.push(toISO(d));
    d.setDate(d.getDate()+1);
  }
  return out;
}
