import { db } from "./firebase.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const empIdInput = document.getElementById("empIdInput");
const dateInput  = document.getElementById("dateInput");
const btnView    = document.getElementById("btnView");
const resultBody = document.getElementById("resultBody");
const resultTitle= document.getElementById("resultTitle");

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

function normalizeToWeekStart(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0,10);
}

btnView.onclick = async ()=>{
  const empId = empIdInput.value.trim();
  const date  = dateInput.value;
  if(!empId || !date) return alert("Enter ID and date");

  const week = normalizeToWeekStart(date);

  const userSnap = await getDoc(doc(db,"users",empId));
  if(!userSnap.exists()){
    return alert("Employee not found");
  }

  const section = userSnap.data().section;

  const docId = `${week}__${section}__${empId}`;
  const shiftSnap = await getDoc(doc(db,"shiftSchedules",docId));

  if(!shiftSnap.exists()){
    resultBody.innerHTML = `<tr><td colspan="7" class="empty">No schedule found</td></tr>`;
    return;
  }

  const data = shiftSnap.data().days;

  resultTitle.textContent = `Schedule for ${empId} — Week ${week}`;

  resultBody.innerHTML = `
    <tr>
      <td>${data.sun}</td>
      <td>${data.mon}</td>
      <td>${data.tue}</td>
      <td>${data.wed}</td>
      <td>${data.thu}</td>
      <td>${data.fri}</td>
      <td>${data.sat}</td>
    </tr>
  `;
};
