import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const body = document.getElementById("reportsBody");
const empty = document.getElementById("emptyState");

/* ===============================
   Load Reports (Firestore)
================================ */
async function loadReports() {
  body.innerHTML = "";
  empty.style.display = "none";

  const snap = await getDocs(collection(db, "kpi_reports"));

  if (snap.empty) {
    empty.style.display = "block";
    return;
  }

  snap.forEach(d => {
    const r = d.data();

    body.innerHTML += `
      <tr>
        <td>${r.title || "Untitled KPI"}</td>
        <td>${r.month}</td>
        <td>-</td>
        <td>${r.createdAt?.toDate().toLocaleString() || "-"}</td>
        <td>
          <button onclick="editReport('${d.id}')">Edit</button>
          <button onclick="deleteReport('${d.id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

/* ===============================
   Edit
================================ */
window.editReport = function (id) {
  localStorage.setItem("edit_kpi_id", id);
  location.href = "kpi_productivity.html";
};

/* ===============================
   Delete
================================ */
window.deleteReport = async function (id) {
  if (!confirm("Delete this KPI report?")) return;

  await deleteDoc(doc(db, "kpi_reports", id));
  loadReports();
};

loadReports();
