import { db } from "./firebase.js";
import {
  doc, getDoc,
  collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   🔐 Admin Access Guard
================================ */
async function checkAdminAccess() {
  const email = localStorage.getItem("kb_user_email");

  if (!email) {
    window.location.href = "login.html";
    return false;
  }

  try {
    const userRef = doc(db, "users", email);
    const snap = await getDoc(userRef);

    if (!snap.exists() || snap.data().role !== "admin") {
      document.getElementById("requestPageContent").style.display = "none";
      document.getElementById("unauthorizedBox").style.display = "flex";
      return false;
    }

    document.getElementById("requestPageContent").style.display = "block";
    document.getElementById("unauthorizedBox").style.display = "none";
    return true;

  } catch (err) {
    console.error("Admin check error:", err);
    document.getElementById("requestPageContent").style.display = "none";
    document.getElementById("unauthorizedBox").style.display = "flex";
    return false;
  }
}

/* ===============================
   Firestore
================================ */
const REQUESTS_COL = "requests";
let unsubRequests = null;
let requests = [];

/* ===============================
   Board elements
================================ */
const colInProgress = document.getElementById("colInProgress");
const colDone = document.getElementById("colDone");

const countInProgress = document.getElementById("countInProgress");
const countDone = document.getElementById("countDone");
const countInProgressTop = document.getElementById("countInProgressTop");
const countDoneTop = document.getElementById("countDoneTop");

/* ===============================
   Helpers
================================ */
function openModal(overlay) { overlay.classList.add("active"); }
function closeModal(overlay) { overlay.classList.remove("active"); }

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("ar-IQ"); }
  catch { return "—"; }
}

function setCount(el, n){
  if (!el) return;
  el.textContent = String(n);
}

/* ===============================
   Modals Elements
================================ */
const createOverlay = document.getElementById("createOverlay");
const createCloseX = document.getElementById("createCloseX");
const createCancelBtn = document.getElementById("createCancelBtn");
const createSaveBtn = document.getElementById("createSaveBtn");

const updateOverlay = document.getElementById("updateOverlay");
const updateCloseX = document.getElementById("updateCloseX");
const updateCancelBtn = document.getElementById("updateCancelBtn");
const updateSaveBtn = document.getElementById("updateSaveBtn");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmCloseX = document.getElementById("confirmCloseX");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const detailsOverlay = document.getElementById("detailsOverlay");
const detailsCloseX = document.getElementById("detailsCloseX");

/* ===============================
   Create Modal Inputs
================================ */
const cEmpName = document.getElementById("cEmpName");
const cEmpId = document.getElementById("cEmpId");
const cReqDesc = document.getElementById("cReqDesc");

const cReqTitleSelect = document.getElementById("cReqTitleSelect");
const cReqTitleCustom = document.getElementById("cReqTitleCustom");
const otherTitleGroup = document.getElementById("otherTitleGroup");

/* ===============================
   Update Modal Inputs
================================ */
const uReqId = document.getElementById("uReqId");
const uEmpName = document.getElementById("uEmpName");
const uEmpId = document.getElementById("uEmpId");
const uReqTitle = document.getElementById("uReqTitle");
const uReqDesc = document.getElementById("uReqDesc");
const uReqStatus = document.getElementById("uReqStatus");

/* ===============================
   Confirm Delete
================================ */
const confirmInfo = document.getElementById("confirmInfo");
const confirmReqId = document.getElementById("confirmReqId");

/* ===============================
   Details Modal Elements
================================ */
const dReqId = document.getElementById("dReqId");
const dTitle = document.getElementById("dTitle");
const dEmployee = document.getElementById("dEmployee");
const dEmployeeId = document.getElementById("dEmployeeId");
const dOpenedAt = document.getElementById("dOpenedAt");
const dDoneAt = document.getElementById("dDoneAt");
const dDesc = document.getElementById("dDesc");
const dStatus = document.getElementById("dStatus");
const dDocId = document.getElementById("dDocId");

const detailsDoneBtn = document.getElementById("detailsDoneBtn");
const detailsEditBtn = document.getElementById("detailsEditBtn");
const detailsDeleteBtn = document.getElementById("detailsDeleteBtn");

/* ===============================
   Dropdown Logic (Other Task)
================================ */
if (cReqTitleSelect) {
  cReqTitleSelect.addEventListener("change", () => {
    if (cReqTitleSelect.value === "Other Task") {
      otherTitleGroup.style.display = "block";
    } else {
      otherTitleGroup.style.display = "none";
      cReqTitleCustom.value = "";
    }
  });
}

/* ===============================
   Create Request
================================ */
async function createRequestFromModal() {
  const employee = (cEmpName.value || "").trim();
  const employeeId = (cEmpId.value || "").trim();
  const description = (cReqDesc.value || "").trim();

  let title = "";
  if (cReqTitleSelect.value === "Other Task") {
    title = (cReqTitleCustom.value || "").trim();
  } else {
    title = (cReqTitleSelect.value || "").trim();
  }

  if (!employee || !title) {
    alert("الرجاء إدخال اسم الموظف وعنوان الطلب");
    return;
  }

  const payload = {
    employee,
    employeeId,
    title,
    description,
    status: "in-progress",
    openedAt: serverTimestamp(),
    doneAt: null,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, REQUESTS_COL), payload);
    closeModal(createOverlay);
    resetCreateModal();
  } catch (err) {
    console.error("Create request error:", err);
    alert("فشل إنشاء الطلب");
  }
}

function resetCreateModal() {
  cEmpName.value = "";
  cEmpId.value = "";
  cReqDesc.value = "";
  cReqTitleSelect.value = "";
  cReqTitleCustom.value = "";
  otherTitleGroup.style.display = "none";
}

createCloseX.onclick = () => closeModal(createOverlay);
createCancelBtn.onclick = () => closeModal(createOverlay);
createSaveBtn.onclick = createRequestFromModal;

/* ===============================
   Update Request
================================ */
function openUpdateModal(req) {
  uReqId.value = req.id;
  uEmpName.value = req.employee || "";
  uEmpId.value = req.employeeId || "";
  uReqTitle.value = req.title || "";
  uReqDesc.value = req.description || "";
  uReqStatus.value = req.status || "in-progress";
  openModal(updateOverlay);
}

async function saveUpdateModal() {
  const id = uReqId.value;
  const employee = (uEmpName.value || "").trim();
  const employeeId = (uEmpId.value || "").trim();
  const title = (uReqTitle.value || "").trim();
  const description = (uReqDesc.value || "").trim();
  const status = uReqStatus.value;

  if (!employee || !title) {
    alert("الرجاء إدخال اسم الموظف وعنوان الطلب");
    return;
  }

  const payload = { employee, employeeId, title, description, status };
  if (status === "done") payload.doneAt = serverTimestamp();

  try {
    await updateDoc(doc(db, REQUESTS_COL, id), payload);
    closeModal(updateOverlay);
  } catch (err) {
    console.error("Update request error:", err);
    alert("فشل حفظ التعديلات");
  }
}

updateCloseX.onclick = () => closeModal(updateOverlay);
updateCancelBtn.onclick = () => closeModal(updateOverlay);
updateSaveBtn.onclick = saveUpdateModal;

/* ===============================
   Delete Request
================================ */
function openDeleteConfirm(req) {
  confirmReqId.value = req.id;
  confirmInfo.innerHTML = `
    <div><strong>العنوان:</strong> ${req.title}</div>
    <div><strong>الموظف:</strong> ${req.employee}</div>
  `;
  openModal(confirmOverlay);
}

async function confirmDelete() {
  const id = confirmReqId.value;
  try {
    await deleteDoc(doc(db, REQUESTS_COL, id));
    closeModal(confirmOverlay);
    closeModal(detailsOverlay);
  } catch (err) {
    console.error("Delete request error:", err);
    alert("فشل حذف الطلب");
  }
}

confirmCloseX.onclick = () => closeModal(confirmOverlay);
confirmCancelBtn.onclick = () => closeModal(confirmOverlay);
confirmDeleteBtn.onclick = confirmDelete;

/* ===============================
   Details Modal Buttons (🔥 FIXED)
================================ */
detailsCloseX.onclick = () => closeModal(detailsOverlay);

detailsDoneBtn.onclick = async () => {
  const id = dReqId.value;
  if (!id) return;

  try {
    await updateDoc(doc(db, REQUESTS_COL, id), {
      status: "done",
      doneAt: serverTimestamp()
    });
    closeModal(detailsOverlay);
  } catch (err) {
    console.error(err);
    alert("فشل تحديث الحالة");
  }
};

detailsEditBtn.onclick = () => {
  const id = dReqId.value;
  const req = requests.find(r => r.id === id);
  if (!req) return;

  closeModal(detailsOverlay);
  openUpdateModal(req);
};

detailsDeleteBtn.onclick = () => {
  const id = dReqId.value;
  const req = requests.find(r => r.id === id);
  if (!req) return;

  closeModal(detailsOverlay);
  openDeleteConfirm(req);
};

/* ===============================
   Details Modal Open
================================ */
function openDetailsModal(req){
  dReqId.value = req.id;
  dTitle.textContent = req.title || "—";
  dEmployee.textContent = req.employee || "—";
  dEmployeeId.textContent = req.employeeId || "—";
  dOpenedAt.textContent = fmt(req.openedAt);
  dDoneAt.textContent = req.doneAt ? fmt(req.doneAt) : "—";
  dDesc.textContent = req.description || "—";
  dDocId.textContent = `ID: ${req.id || "—"}`;

  if (req.status === "done") {
    dStatus.textContent = "Done";
    dStatus.className = "pill pill-done";
    detailsDoneBtn.style.display = "none";
  } else {
    dStatus.textContent = "In Progress";
    dStatus.className = "pill pill-progress";
    detailsDoneBtn.style.display = "inline-flex";
  }

  openModal(detailsOverlay);
}

/* ===============================
   Render Board
================================ */
function renderBoard() {
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  let inProg = 0, done = 0;

  requests.forEach(req => {
    const card = document.createElement("div");
    card.className = "task-card";
    if (req.status === "done") card.classList.add("done");

    card.innerHTML = `
      <div class="task-title">${req.title}</div>
      <div class="task-meta">
        <span class="label">👤</span>
        <span>${req.employee}</span>
        ${req.employeeId ? `<span class="label">🆔</span><span>${req.employeeId}</span>` : ""}
      </div>
      <div class="task-meta">
        <span class="label">🕒 فتح:</span>
        <span>${fmt(req.openedAt)}</span>
      </div>
      ${
        req.status === "done" && req.doneAt
          ? `<div class="task-meta"><span class="label">✅ إغلاق:</span><span>${fmt(req.doneAt)}</span></div>`
          : ""
      }
    `;

    card.onclick = () => openDetailsModal(req);

    if (req.status === "in-progress") {
      colInProgress.appendChild(card);
      inProg++;
    } else {
      colDone.appendChild(card);
      done++;
    }
  });

  setCount(countInProgress, inProg);
  setCount(countDone, done);
  setCount(countInProgressTop, inProg);
  setCount(countDoneTop, done);
}

/* ===============================
   Firestore Subscribe
================================ */
function subscribeRequests() {
  if (unsubRequests) unsubRequests();

  const qy = query(collection(db, REQUESTS_COL), orderBy("createdAt", "desc"));

  unsubRequests = onSnapshot(qy, (snap) => {
    const list = [];

    snap.forEach(d => {
      const data = d.data() || {};

      list.push({
        id: d.id,
        employee: data.employee ?? "",
        employeeId: data.employeeId ?? "",
        title: data.title ?? "",
        description: data.description ?? "",
        status: data.status ?? "in-progress",
        openedAt: data.openedAt?.toDate ? data.openedAt.toDate().toISOString() : null,
        doneAt: data.doneAt?.toDate ? data.doneAt.toDate().toISOString() : null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null
      });
    });

    requests = list;
    renderBoard();
  });
}

/* ===============================
   Top Buttons
================================ */
document.getElementById("openCreateBtn").onclick = () => openModal(createOverlay);

/* ===============================
   INIT
================================ */
async function initRequestsPage() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;
  subscribeRequests();
}

initRequestsPage();
