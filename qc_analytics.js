/* ===============================
  QC Analytics (UI + API-ready) FINAL
  - contains search ✅
  - % formatting ✅
  - Trend + Radar + Distribution ✅
  - Arabic + English Insight ✅
=============================== */

/* ========= AUTH GUARD ========= */
(function authGuard(){
  const email = localStorage.getItem("kb_user_email") || "";
  if (!email) location.href = "login.html";
})();

/* ========= DOM ========= */
const empNameInput = document.getElementById("empNameInput");
const fromDateEl   = document.getElementById("fromDate");
const toDateEl     = document.getElementById("toDate");
const sourceSelect = document.getElementById("sourceSelect");
const apiStateText = document.getElementById("apiStateText");

const btnSearch  = document.getElementById("btnSearch");
const btnClear   = document.getElementById("btnClear");
const btnRefresh = document.getElementById("btnRefresh");
const btnGeneral = document.getElementById("btnGeneral");

const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");

const empSummary    = document.getElementById("empSummary");
const empInsights   = document.getElementById("empInsights");
const empCards      = document.getElementById("empCards");
const chartsSection = document.getElementById("chartsSection");
const detailsCard   = document.getElementById("detailsCard");
const emptyState    = document.getElementById("emptyState");

const empTitle = document.getElementById("empTitle");
const empSub   = document.getElementById("empSub");
const empCount = document.getElementById("empCount");
const empAvg   = document.getElementById("empAvg");
const empLast  = document.getElementById("empLast");
const empBest  = document.getElementById("empBest");

const empMostNote      = document.getElementById("empMostNote");
const empMostNoteCount = document.getElementById("empMostNoteCount");
const empHigh          = document.getElementById("empHigh");
const empLow           = document.getElementById("empLow");
const empWeakCat       = document.getElementById("empWeakCat");

const detailsBody = document.getElementById("detailsBody");

const genTopEmp      = document.getElementById("genTopEmp");
const genTopEmpSub   = document.getElementById("genTopEmpSub");
const genLowEmp      = document.getElementById("genLowEmp");
const genLowEmpSub   = document.getElementById("genLowEmpSub");
const genMostNote    = document.getElementById("genMostNote");
const genMostNoteSub = document.getElementById("genMostNoteSub");
const genWeakCat     = document.getElementById("genWeakCat");

/* Insights DOM */
const empBadge       = document.getElementById("empBadge");
const empTrend       = document.getElementById("empTrend");
const empHealthScore = document.getElementById("empHealthScore");
const empHealthSub   = document.getElementById("empHealthSub");
const empLastScore   = document.getElementById("empLastScore");
const empLastVsAvg   = document.getElementById("empLastVsAvg");
const empVolatility  = document.getElementById("empVolatility");
const empVsTeam      = document.getElementById("empVsTeam");
const empVsTeamSub   = document.getElementById("empVsTeamSub");

/* ========= State ========= */
let ALL_ROWS = [];
const API_URL = "https://example.com/qc-data";

/* ========= Chart refs ========= */
let trendChart = null, radarChart = null, distChart = null;

/* ========= Helpers ========= */
function setStatus(type, text){
  statusPill.className = "status-pill " + (type || "neutral");
  statusText.textContent = text || "";
}

function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(nums){
  const clean = nums.filter(n => typeof n === "number" && !isNaN(n));
  if (!clean.length) return null;
  return clean.reduce((a,b)=>a+b,0) / clean.length;
}

function parseDateLike(v){
  if (!v) return null;
  const isoTry = new Date(v);
  if (!isNaN(isoTry.getTime())) return isoTry;

  const parts = String(v).trim().split(" ");
  const mdY = parts[0];
  const time = parts[1] || "00:00";
  const [m,d,y] = mdY.split("/").map(n=>parseInt(n,10));
  if (!m || !d || !y) return null;
  const [hh,mm] = time.split(":").map(n=>parseInt(n,10));
  return new Date(y, m-1, d, (hh||0), (mm||0), 0);
}

function fmtDate(d){
  if (!d) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function scoreClass(pct){
  if (pct >= 85) return "good";
  if (pct >= 70) return "warn";
  return "bad";
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function mostFrequentText(arr){
  const map = new Map();
  for (const t of arr){
    const s = String(t||"").trim();
    if (!s) continue;
    map.set(s, (map.get(s)||0) + 1);
  }
  let best = null, bestCount = 0;
  for (const [k,c] of map.entries()){
    if (c > bestCount){
      best = k; bestCount = c;
    }
  }
  return { text: best, count: bestCount };
}

function groupBy(arr, keyFn){
  const m = new Map();
  arr.forEach(x=>{
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  });
  return m;
}

function ratioToPct(val){
  const s = String(val||"").trim();
  if (!s || s.toLowerCase()==="na") return null;
  if (!s.includes("/")) return null;
  const [a,b] = s.split("/").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b<=0) return null;
  return (a/b)*100;
}

function findWeakCategory(row){
  const cats = [
    ["Answer & Ending", row.answerEnding],
    ["Case writing & Category", row.caseWriting],
    ["Communication Skills", row.communication],
    ["Diagnosis", row.diagnosis],
    ["Problem Solve", row.problemSolve],
  ];

  const norm = [];
  for (const [name,val] of cats){
    const pct = ratioToPct(val);
    if (pct == null) continue;
    norm.push({ name, pct });
  }
  if (!norm.length) return "—";
  norm.sort((x,y)=>x.pct - y.pct);
  return norm[0].name;
}

/* ========= MOCK ========= */
function getMockRows(){
  return [
    //////////////// Jawad Kadhum
    {
      employee:"Jawad Kadhum Hadi al-Dahhan",
      date:"1/24/2025 23:05",
      callId:"10622637",
      finalScore:82,
      note:"تحسين ختام المكالمة مطلوب",
      answerEnding:"8/15",
      caseWriting:"10/15",
      communication:"28/30",
      diagnosis:"18/20",
      problemSolve:"NA"
    },
    {
      employee:"Jawad Kadhum Hadi al-Dahhan",
      date:"1/24/2025 22:08",
      callId:"10621855",
      finalScore:91,
      note:"أداء ممتاز مع ملاحظة بسيطة",
      answerEnding:"14/15",
      caseWriting:"NA",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Jawad Kadhum Hadi al-Dahhan",
      date:"1/24/2025 21:42",
      callId:"10621482",
      finalScore:76,
      note:"ضعف في إنهاء الاتصال",
      answerEnding:"6/15",
      caseWriting:"15/15",
      communication:"25/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Jawad Kadhum Hadi al-Dahhan",
      date:"1/26/2025 0:23",
      callId:"10635687",
      finalScore:88,
      note:"تواصل جيد لكن التشخيص متوسط",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"27/30",
      diagnosis:"12/20",
      problemSolve:"NA"
    },
    {
      employee:"Jawad Kadhum Hadi al-Dahhan",
      date:"1/26/2025 0:18",
      callId:"10635655",
      finalScore:93,
      note:"أداء قوي جداً",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"29/30",
      diagnosis:"19/20",
      problemSolve:"NA"
    },

    //////////////// Ahmad Radi
    {
      employee:"Ahmad Radi",
      date:"1/26/2025 0:18",
      callId:"10635655",
      finalScore:85,
      note:"تحسين إدارة المكالمة",
      answerEnding:"12/15",
      caseWriting:"15/15",
      communication:"26/30",
      diagnosis:"18/20",
      problemSolve:"NA"
    },
    {
      employee:"Ahmad Radi",
      date:"1/24/2025 23:05",
      callId:"10622637",
      finalScore:70,
      note:"ضعف في طرح الاستفسارات",
      answerEnding:"7/15",
      caseWriting:"0/15",
      communication:"28/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ahmad Radi",
      date:"1/24/2025 22:08",
      callId:"10621855",
      finalScore:96,
      note:"أداء ممتاز جداً",
      answerEnding:"14/15",
      caseWriting:"NA",
      communication:"30/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ahmad Radi",
      date:"1/24/2025 21:42",
      callId:"10621482",
      finalScore:62,
      note:"ضعف في الختام والتواصل",
      answerEnding:"5/15",
      caseWriting:"15/15",
      communication:"22/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ahmad Radi",
      date:"1/26/2025 0:23",
      callId:"10635687",
      finalScore:58,
      note:"الحاجة إلى تحسين شامل",
      answerEnding:"8/15",
      caseWriting:"10/15",
      communication:"20/30",
      diagnosis:"10/20",
      problemSolve:"NA"
    },

    //////////////// Layth Qahtan
    {
      employee:"Layth Qahtan",
      date:"1/26/2025 0:18",
      callId:"10635655",
      finalScore:90,
      note:"أداء ثابت وجيد",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"28/30",
      diagnosis:"17/20",
      problemSolve:"NA"
    },
    {
      employee:"Layth Qahtan",
      date:"1/24/2025 23:05",
      callId:"10622637",
      finalScore:74,
      note:"ضعف في التوثيق",
      answerEnding:"10/15",
      caseWriting:"5/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Layth Qahtan",
      date:"1/24/2025 22:08",
      callId:"10621855",
      finalScore:89,
      note:"أداء جيد جداً",
      answerEnding:"12/15",
      caseWriting:"NA",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Layth Qahtan",
      date:"1/24/2025 21:42",
      callId:"10621482",
      finalScore:83,
      note:"ختام يحتاج تحسين بسيط",
      answerEnding:"7/15",
      caseWriting:"15/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Layth Qahtan",
      date:"1/26/2025 0:23",
      callId:"10635687",
      finalScore:86,
      note:"تشخيص متوسط",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"26/30",
      diagnosis:"12/20",
      problemSolve:"NA"
    },

    //////////////// Ali Abbas
    {
      employee:"Ali Abbas",
      date:"1/26/2025 0:18",
      callId:"10635655",
      finalScore:88,
      note:"أداء جيد",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"26/30",
      diagnosis:"17/20",
      problemSolve:"NA"
    },
    {
      employee:"Ali Abbas",
      date:"1/24/2025 23:05",
      callId:"10622637",
      finalScore:72,
      note:"ضعف في كتابة الحالة",
      answerEnding:"10/15",
      caseWriting:"3/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ali Abbas",
      date:"1/24/2025 22:08",
      callId:"10621855",
      finalScore:91,
      note:"مستوى عالي",
      answerEnding:"14/15",
      caseWriting:"NA",
      communication:"30/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ali Abbas",
      date:"1/24/2025 21:42",
      callId:"10621482",
      finalScore:84,
      note:"ختام متوسط",
      answerEnding:"6/15",
      caseWriting:"15/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Ali Abbas",
      date:"1/26/2025 0:23",
      callId:"10635687",
      finalScore:87,
      note:"تشخيص يحتاج دعم",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"27/30",
      diagnosis:"12/20",
      problemSolve:"NA"
    },

    //////////////// Shams Zuhayr
    {
      employee:"Shams Zuhayr",
      date:"1/26/2025 0:18",
      callId:"10635655",
      finalScore:92,
      note:"أداء ممتاز",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"29/30",
      diagnosis:"18/20",
      problemSolve:"NA"
    },
    {
      employee:"Shams Zuhayr",
      date:"1/24/2025 23:05",
      callId:"10622637",
      finalScore:78,
      note:"ضعف في المتابعة",
      answerEnding:"10/15",
      caseWriting:"5/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Shams Zuhayr",
      date:"1/24/2025 22:08",
      callId:"10621855",
      finalScore:89,
      note:"أداء جيد جداً",
      answerEnding:"12/15",
      caseWriting:"NA",
      communication:"30/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Shams Zuhayr",
      date:"1/24/2025 21:42",
      callId:"10621482",
      finalScore:85,
      note:"تحسين الختام مطلوب",
      answerEnding:"7/15",
      caseWriting:"15/15",
      communication:"29/30",
      diagnosis:"20/20",
      problemSolve:"NA"
    },
    {
      employee:"Shams Zuhayr",
      date:"1/26/2025 0:23",
      callId:"10635687",
      finalScore:88,
      note:"تشخيص متوسط",
      answerEnding:"15/15",
      caseWriting:"15/15",
      communication:"27/30",
      diagnosis:"12/20",
      problemSolve:"NA"
    }
  ];
}

/* ========= Fetch Data ========= */
async function loadAllData(){
  const src = sourceSelect.value;
  apiStateText.textContent = (src === "mock") ? "Mock Mode" : "API Mode";

  setStatus("neutral", "جاري تحميل البيانات...");
  try{
    let rows = [];
    if (src === "mock"){
      rows = getMockRows();
    } else {
      const res = await fetch(API_URL, { method:"GET" });
      if (!res.ok) throw new Error("API error: " + res.status);
      const json = await res.json();
      rows = Array.isArray(json) ? json : (json.rows || []);
    }

    ALL_ROWS = rows.map(r => ({
      employee: String(r.employee || r.Employee || r.name || "").trim(),
      date: r.date || r.Date || r.datetime || "",
      callId: String(r.callId || r.CallID || r.src || r.SRC || r.ticket || "").trim(),
      finalScore: safeNum(r.finalScore ?? r.score ?? r.FinalScore ?? r.percent),
      note: r.note || r.Note || r.comment || "",
      answerEnding: r.answerEnding || r["Answer & Ending"] || r.answer || "",
      caseWriting: r.caseWriting || r["Case writing & Category"] || r.case || "",
      communication: r.communication || r["Communication Skills"] || r.comm || "",
      diagnosis: r.diagnosis || r["Diagnosis"] || "",
      problemSolve: r.problemSolve || r["Problem Solve"] || "",
    })).filter(x => x.employee);

    setStatus("good", `تم تحميل ${ALL_ROWS.length} سجل`);
    computeGeneralAnalytics();
  }catch(err){
    console.error(err);
    setStatus("bad", "فشل تحميل البيانات (تم التحويل إلى Mock)");
    apiStateText.textContent = "Mock Mode";
    ALL_ROWS = getMockRows();
    computeGeneralAnalytics();
  }
}

/* ========= contains search (best match) ========= */
function resolveEmployeeNameContains(query){
  const q = String(query||"").trim().toLowerCase();
  if (!q) return null;

  const mapCount = new Map();
  ALL_ROWS.forEach(r=>{
    const name = (r.employee||"").trim();
    if (!name) return;
    if (name.toLowerCase().includes(q)){
      mapCount.set(name, (mapCount.get(name)||0) + 1);
    }
  });

  if (!mapCount.size) return null;

  // choose with max count
  let best = null, bestCount = -1;
  for (const [name,c] of mapCount.entries()){
    if (c > bestCount){
      best = name; bestCount = c;
    }
  }
  return { name: best, matches: mapCount.size, rowsCount: bestCount };
}

/* ========= Filtering ========= */
function filterRowsByEmployeeAndDate(exactEmployeeName, fromStr, toStr){
  const from = fromStr ? new Date(fromStr + "T00:00:00") : null;
  const to   = toStr ? new Date(toStr + "T23:59:59") : null;

  return ALL_ROWS.filter(r=>{
    if (!r.employee) return false;
    if (exactEmployeeName && r.employee !== exactEmployeeName) return false;

    const d = parseDateLike(r.date);
    if (!d) return false;

    if (from && d < from) return false;
    if (to && d > to) return false;

    return true;
  });
}

/* ========= CHARTS ========= */
function destroyCharts(){
  [trendChart, radarChart, distChart].forEach(c=>{
    if (c) c.destroy();
  });
  trendChart = radarChart = distChart = null;
}

function renderCharts(rows){
  if (typeof Chart === "undefined") return;

  destroyCharts();
  chartsSection.classList.remove("hidden");

  // sort ASC by date for trend
  const sorted = [...rows].sort((a,b)=> parseDateLike(a.date) - parseDateLike(b.date));
  const labels = sorted.map(r=>fmtDate(parseDateLike(r.date)));
  const scores = sorted.map(r=>r.finalScore).filter(v=>typeof v==="number");

  const trendScores = sorted.map(r => (typeof r.finalScore==="number" ? r.finalScore : null));
  const avgScore = avg(trendScores.filter(x=>x!=null));

  // Trend line
  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Score %",
          data: trendScores,
          borderColor: "#0038a8",
          backgroundColor: "rgba(0,56,168,.12)",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
        },
        {
          label: "Average",
          data: labels.map(()=>avgScore),
          borderColor: "#00c2a8",
          borderDash: [6,6],
          pointRadius: 0,
        }
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ display:true } },
      scales:{
        y:{ min:0, max:100 }
      }
    }
  });

  // Trend insight (first vs last)
  const first = trendScores.find(x=>x!=null);
  const last  = [...trendScores].reverse().find(x=>x!=null);
  const diff = (first!=null && last!=null) ? (last-first) : 0;

  const ar =
    diff > 2 ? `تحسّن واضح (+${diff.toFixed(1)}%).` :
    diff < -2 ? `تراجع ملحوظ (${diff.toFixed(1)}%).` :
    `الأداء مستقر تقريباً (${diff.toFixed(1)}%).`;

  const en =
    diff > 2 ? `Clear improvement (+${diff.toFixed(1)}%).` :
    diff < -2 ? `Notable decline (${diff.toFixed(1)}%).` :
    `Performance is fairly stable (${diff.toFixed(1)}%).`;

  document.getElementById("trendInsight").innerHTML =
    `<b>AR:</b> ${ar}<br/><b>EN:</b> ${en}`;

  // Radar (avg axes)
  const axesLabels = ["Answer & Ending","Case Writing","Communication","Diagnosis","Problem Solve"];
  const axesValues = [
    avg(sorted.map(r=>ratioToPct(r.answerEnding)).filter(x=>x!=null)) || 0,
    avg(sorted.map(r=>ratioToPct(r.caseWriting)).filter(x=>x!=null)) || 0,
    avg(sorted.map(r=>ratioToPct(r.communication)).filter(x=>x!=null)) || 0,
    avg(sorted.map(r=>ratioToPct(r.diagnosis)).filter(x=>x!=null)) || 0,
    avg(sorted.map(r=>ratioToPct(r.problemSolve)).filter(x=>x!=null)) || 0,
  ];

  radarChart = new Chart(document.getElementById("radarChart"), {
    type:"radar",
    data:{
      labels: axesLabels,
      datasets:[{
        label:"Employee",
        data: axesValues,
        borderColor:"#00c2a8",
        backgroundColor:"rgba(0,194,168,.18)",
        pointBackgroundColor:"#0038a8",
      }]
    },
    options:{
      scales:{
        r:{ min:0, max:100, ticks:{ display:false } }
      }
    }
  });

  // Distribution bins
  const bins = { "90-100":0, "80-89":0, "70-79":0, "<70":0 };
  scores.forEach(s=>{
    if (s>=90) bins["90-100"]++;
    else if (s>=80) bins["80-89"]++;
    else if (s>=70) bins["70-79"]++;
    else bins["<70"]++;
  });

  distChart = new Chart(document.getElementById("distChart"), {
    type:"bar",
    data:{
      labels: Object.keys(bins),
      datasets:[{
        label:"Count",
        data: Object.values(bins),
        backgroundColor:[
          "rgba(0,194,168,.65)",
          "rgba(0,56,168,.65)",
          "rgba(0,56,168,.35)",
          "rgba(0,194,168,.35)"
        ],
        borderColor:["#00c2a8","#0038a8","#0038a8","#00c2a8"],
        borderWidth:1
      }]
    },
    options:{
      plugins:{ legend:{ display:false } }
    }
  });
}

/* ========= Employee Render ========= */
function renderEmployeeResult(rows, resolvedName, fromStr, toStr, meta){
  // hide first
  empSummary.classList.add("hidden");
  empInsights.classList.add("hidden");
  empCards.classList.add("hidden");
  chartsSection.classList.add("hidden");
  detailsCard.classList.add("hidden");
  emptyState.classList.add("hidden");

  destroyCharts();

  if (!rows.length){
    emptyState.classList.remove("hidden");
    setStatus("warn", "لا توجد بيانات لهذا الموظف ضمن الفترة المختارة");
    return;
  }

  // sort desc by date for summary/table
  rows.sort((a,b)=> parseDateLike(b.date) - parseDateLike(a.date));

  const scores = rows.map(r => r.finalScore).filter(s => typeof s === "number");
  const average = avg(scores);
  const best = scores.length ? Math.max(...scores) : null;
  const worst = scores.length ? Math.min(...scores) : null;
  const lastDate = parseDateLike(rows[0].date);

  empTitle.textContent = resolvedName;
  empSub.textContent =
    `الفترة: ${fromStr || "—"} إلى ${toStr || "—"} • السجلات: ${rows.length}` +
    (meta?.matches && meta.matches > 1 ? ` • (تطابقات: ${meta.matches})` : "");

  empCount.textContent = String(rows.length);
  empAvg.textContent = average == null ? "—" : `${average.toFixed(1)}%`;
  empLast.textContent = fmtDate(lastDate);
  empBest.textContent = best == null ? "—" : `${best.toFixed(1)}%`;

  // Most frequent note
  const mf = mostFrequentText(rows.map(r=>r.note));
  empMostNote.textContent = mf.text ? mf.text : "—";
  empMostNoteCount.textContent = mf.text ? `تكررت ${mf.count} مرات` : "لا توجد ملاحظات";

  empHigh.textContent = best == null ? "—" : `${best.toFixed(1)}%`;
  empLow.textContent  = worst == null ? "—" : `${worst.toFixed(1)}%`;

  // Weakest category (count)
  const weakCounts = new Map();
  rows.forEach(r=>{
    const w = findWeakCategory(r);
    if (!w || w === "—") return;
    weakCounts.set(w, (weakCounts.get(w)||0) + 1);
  });
  let weakCat = "—", weakMax = 0;
  for (const [k,v] of weakCounts.entries()){
    if (v > weakMax){ weakCat = k; weakMax = v; }
  }
  empWeakCat.textContent = weakCat;

  // Table
  detailsBody.innerHTML = rows.map(r=>{
    const d = parseDateLike(r.date);
    const pct = typeof r.finalScore === "number" ? r.finalScore : null;
    const cls = pct == null ? "neutral" : scoreClass(pct);
    const weak = findWeakCategory(r);

    const pill =
      pct == null
        ? `<span class="score-pill bad">—</span>`
        : `<span class="score-pill ${cls}">${pct.toFixed(1)}%</span>`;

    return `
      <tr>
        <td>${fmtDate(d)}</td>
        <td>${r.callId || "—"}</td>
        <td>${pill}</td>
        <td>${weak}</td>
        <td>${r.note ? escapeHtml(r.note) : "—"}</td>
      </tr>
    `;
  }).join("");

  // ===== Insights =====
  const lastScore = scores.length ? scores[0] : null;
  const volatility = (best!=null && worst!=null) ? (best - worst) : null;

  // Health score = avg - (volatility * 0.15) (simple)
  const health = (average!=null && volatility!=null) ? (average - volatility*0.15) : average;

  const overallAvg = avg(ALL_ROWS.map(r=>r.finalScore).filter(x=>typeof x==="number"));
  const diffTeam = (average!=null && overallAvg!=null) ? (average - overallAvg) : null;

  // Badge
  let badgeTxt = "—";
  if (average!=null){
    badgeTxt =
      average >= 90 ? "Excellent ممتاز" :
      average >= 80 ? "Good جيد" :
      average >= 70 ? "Needs Coaching يحتاج تدريب" :
      "Critical ضعيف";
  }

  // Trend (first vs last in ASC)
  const asc = [...rows].sort((a,b)=> parseDateLike(a.date) - parseDateLike(b.date));
  const ascScores = asc.map(r=>r.finalScore).filter(x=>typeof x==="number");
  const diff = ascScores.length ? (ascScores[ascScores.length-1] - ascScores[0]) : 0;

  const trendTxt =
    diff > 2 ? "Improving تحسّن" :
    diff < -2 ? "Declining تراجع" :
    "Stable مستقر";

  empBadge.textContent = badgeTxt;
  empTrend.textContent = trendTxt;

  empHealthScore.textContent = health==null ? "—" : `${health.toFixed(1)}%`;
  empHealthSub.textContent = `AR: مؤشر صحة الأداء • EN: Performance health`;

  empLastScore.textContent = lastScore==null ? "—" : `${lastScore.toFixed(1)}%`;
  empLastVsAvg.textContent =
    (average==null || lastScore==null) ? "—" :
    `AR: آخر تقييم ${ (lastScore-average>=0)? "أعلى" : "أقل" } من المتوسط • EN: ${(lastScore-average>=0)?"Above":"Below"} avg`;

  empVolatility.textContent = volatility==null ? "—" : `${volatility.toFixed(1)}%`;
  empVsTeam.textContent = diffTeam==null ? "—" : `${diffTeam >= 0 ? "+" : ""}${diffTeam.toFixed(1)}%`;
  empVsTeamSub.textContent = "مقارنة بالمعدل العام • vs overall average";

  empSummary.classList.remove("hidden");
  empInsights.classList.remove("hidden");
  empCards.classList.remove("hidden");
  detailsCard.classList.remove("hidden");

  // Charts (All records)
  renderCharts(rows);

  setStatus("good", `تم عرض البيانات: ${resolvedName}`);
}

/* ========= General Analytics ========= */
function computeGeneralAnalytics(){
  if (!ALL_ROWS.length){
    genTopEmp.textContent = "—";
    genLowEmp.textContent = "—";
    genMostNote.textContent = "—";
    genWeakCat.textContent = "—";
    return;
  }

  const groups = groupBy(ALL_ROWS, r=>r.employee);
  const empStats = [];

  for (const [emp, rows] of groups.entries()){
    const scores = rows.map(r=>r.finalScore).filter(s=>typeof s==="number");
    const a = avg(scores);
    empStats.push({ emp, avg: a, count: rows.length });
  }

  const valid = empStats.filter(x=>typeof x.avg==="number");
  valid.sort((a,b)=>b.avg-a.avg);

  const top = valid[0] || null;
  const low = valid[valid.length-1] || null;

  genTopEmp.textContent = top ? top.emp : "—";
  genTopEmpSub.textContent = top ? `Avg: ${top.avg.toFixed(1)}% • Count: ${top.count}` : "—";

  genLowEmp.textContent = low ? low.emp : "—";
  genLowEmpSub.textContent = low ? `Avg: ${low.avg.toFixed(1)}% • Count: ${low.count}` : "—";

  const mf = mostFrequentText(ALL_ROWS.map(r=>r.note));
  genMostNote.textContent = mf.text ? mf.text : "—";
  genMostNoteSub.textContent = mf.text ? `تكررت ${mf.count} مرات` : "لا توجد ملاحظات";

  const weakCounts = new Map();
  ALL_ROWS.forEach(r=>{
    const w = findWeakCategory(r);
    if (!w || w==="—") return;
    weakCounts.set(w, (weakCounts.get(w)||0) + 1);
  });
  let weakCat = "—", max = 0;
  for (const [k,v] of weakCounts.entries()){
    if (v > max){ weakCat = k; max = v; }
  }
  genWeakCat.textContent = weakCat;
}

/* ========= Events ========= */
btnSearch.addEventListener("click", ()=>{
  const query = empNameInput.value.trim();
  if (!query){
    setStatus("warn", "رجاءً أدخل جزء من اسم الموظف");
    return;
  }

  const resolved = resolveEmployeeNameContains(query);
  if (!resolved){
    emptyState.classList.remove("hidden");
    setStatus("warn", "لا يوجد موظف مطابق لهذا النص");
    return;
  }

  const rows = filterRowsByEmployeeAndDate(
    resolved.name,
    fromDateEl.value,
    toDateEl.value
  );

  renderEmployeeResult(rows, resolved.name, fromDateEl.value, toDateEl.value, resolved);
});

btnClear.addEventListener("click", ()=>{
  empNameInput.value = "";
  fromDateEl.value = "";
  toDateEl.value = "";

  empSummary.classList.add("hidden");
  empInsights.classList.add("hidden");
  empCards.classList.add("hidden");
  chartsSection.classList.add("hidden");
  detailsCard.classList.add("hidden");
  emptyState.classList.add("hidden");

  destroyCharts();
  setStatus("neutral", "تم التفريغ");
});

btnRefresh.addEventListener("click", async ()=>{
  await loadAllData();
});

btnGeneral.addEventListener("click", ()=>{
  computeGeneralAnalytics();
  setStatus("good", "تم تحديث التحليل العام");
});

/* ========= Init ========= */
(async function init(){
  await loadAllData();
  setStatus("neutral", "اكتب جزء من الاسم واضغط بحث");
})();
