import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs, query, where,
  addDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const sectionSelect = document.getElementById("sectionSelect");
const weekStartEl   = document.getElementById("weekStart");
const btnLoad       = document.getElementById("btnLoad");
const btnPrint      = document.getElementById("btnPrint");
const stateEl       = document.getElementById("state");
const scheduleBody  = document.getElementById("scheduleBody");
const tableTitle    = document.getElementById("tableTitle");
const tableSubtitle = document.getElementById("tableSubtitle");
const searchInput   = document.getElementById("searchInput");
const btnAutoFillOff= document.getElementById("btnAutoFillOff");

let isAdmin = false;
let shiftTypes = [];
let shiftColorMap = new Map();
let allRows = [];
let lockedWeek = null;

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

function normalizeToWeekStart(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0,10);
}

async function checkAdmin(){
  const email = localStorage.getItem("kb_user_email") || "";
  const snap = await getDoc(doc(db,"users",email));
  isAdmin = snap.exists() && snap.data().role === "admin";
  document.body.classList.toggle("not-admin", !isAdmin);
}

async function loadSections(){
  const snap = await getDocs(collection(db,"sections"));
  sectionSelect.innerHTML = `<option value="">Select Section</option>`;
  snap.forEach(d=>{
    const s = d.data();
    if(s?.active !== false){
      sectionSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    }
  });
}

async function loadShiftTypes(){
  shiftTypes = [];
  shiftColorMap.clear();
  const snap = await getDocs(collection(db,"shiftTypes"));
  snap.forEach(d=>{
    const s = d.data();
    shiftTypes.push(s);
    shiftColorMap.set(s.label, s.color);
  });
}

async function loadEmployees(section){
  const q = query(collection(db,"users"), where("section","==",section));
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach(d=>{
    const u = d.data();
    if(u.active !== false){
      arr.push({ id:u.employeeId, name:u.name, section });
    }
  });
  return arr;
}

function scheduleDocId(week, section, empId){
  return `${week}__${section}__${empId}`;
}

async function ensureSchedules(week, section, employees){
  for(const emp of employees){
    const ref = doc(db,"shiftSchedules", scheduleDocId(week,section,emp.id));
    const snap = await getDoc(ref);
    if(!snap.exists()){
      const days = {};
      DAYS.forEach(d=> days[d]="Off");
      await setDoc(ref,{
        employeeId: emp.id,
        name: emp.name,
        section,
        weekStart: week,
        days,
        createdAt: serverTimestamp()
      });
    }
  }
}

async function loadSchedules(week, section){
  const q = query(collection(db,"shiftSchedules"),
    where("section","==",section),
    where("weekStart","==",week)
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d=>{
    rows.push({ docId:d.id, ...d.data() });
  });
  return rows;
}

function renderTable(rows){
  allRows = rows;
  const q = searchInput.value?.toLowerCase() || "";
  const filtered = rows.filter(r =>
    r.employeeId.includes(q) || r.name.toLowerCase().includes(q)
  );

  if(!filtered.length){
    scheduleBody.innerHTML = `<tr><td colspan="9" class="empty">No data</td></tr>`;
    return;
  }

  scheduleBody.innerHTML = filtered.map(r=>{
    const cells = DAYS.map(day=>{
      const val = r.days?.[day] || "Off";
      const options = shiftTypes.map(s=>{
        return `<option value="${s.label}" ${s.label===val?"selected":""}>${s.label}</option>`;
      }).join("");

      return `
        <td>
          <select class="shift-cell" data-id="${r.docId}" data-day="${day}" ${isAdmin?"":"disabled"}>
            ${options}
          </select>
        </td>
      `;
    }).join("");

    return `
      <tr>
        <td>${r.employeeId}</td>
        <td>${r.name}</td>
        ${cells}
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".shift-cell").forEach(el=>{
    const color = shiftColorMap.get(el.value);
    if(color){
      el.style.background = color;
      el.style.color = "#fff";
    }
  });
}

document.addEventListener("change", async (e)=>{
  if(!e.target.classList.contains("shift-cell")) return;
  if(!isAdmin) return;

  const id  = e.target.dataset.id;
  const day = e.target.dataset.day;
  const val = e.target.value;

  await updateDoc(doc(db,"shiftSchedules",id),{
    [`days.${day}`]: val,
    updatedAt: serverTimestamp()
  });

  const color = shiftColorMap.get(val);
  if(color){
    e.target.style.background = color;
    e.target.style.color = "#fff";
  }
});

btnLoad.onclick = async ()=>{
  const section = sectionSelect.value;
  const date    = weekStartEl.value;
  if(!section || !date) return alert("Select section and week");

  const week = normalizeToWeekStart(date);

  lockedWeek = week;
  weekStartEl.value = week;
  weekStartEl.disabled = true;   // 🔒 يثبت التاريخ بعد أول Load

  tableTitle.textContent = `Shift Schedule – ${section}`;
  tableSubtitle.textContent = `Week: ${week}`;

  const emps = await loadEmployees(section);
  if(isAdmin) await ensureSchedules(week,section,emps);

  const rows = await loadSchedules(week,section);
  renderTable(rows);

  stateEl.textContent = "Loaded & Locked.";
};

btnPrint.onclick = ()=> window.print();

btnAutoFillOff.onclick = async ()=>{
  if(!isAdmin) return;
  for(const r of allRows){
    const updates = {};
    DAYS.forEach(d=>{
      updates[`days.${d}`]="Off";
    });
    await updateDoc(doc(db,"shiftSchedules",r.docId),updates);
  }
  btnLoad.click();
};

(async function(){
  await checkAdmin();
  await loadSections();
  await loadShiftTypes();

  const today = new Date().toISOString().slice(0,10);
  weekStartEl.value = normalizeToWeekStart(today);
})();
