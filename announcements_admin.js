/* ===============================
  Announcements Admin (FULL)
  - Publish announcement with authorName ✅
  - Toggle active/inactive
  - Delete announcement
  - Stats: seen / unseen (based on users collection count)
=============================== */

import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc,
  serverTimestamp, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ========= AUTH GUARD ========= */
async function requireAdmin(){
  const email = localStorage.getItem("kb_user_email") || "";
  if (!email) { location.href = "login.html"; return false; }

  try{
    const uref = doc(db, "users", email);
    const snap = await getDoc(uref);
    const role = snap.exists() ? (snap.data().role || "") : "";
    if (role !== "admin"){
      document.getElementById("unauthorizedBox").style.display = "flex";
      document.getElementById("pageContent").style.display = "none";
      return false;
    }
    document.getElementById("unauthorizedBox").style.display = "none";
    document.getElementById("pageContent").style.display = "block";
    return true;
  }catch(e){
    console.error(e);
    alert("Auth error. Check users collection.");
    return false;
  }
  
}

/* ========= DOM ========= */
const aTitle    = document.getElementById("aTitle");
const aAuthor   = document.getElementById("aAuthor");
const aPriority = document.getElementById("aPriority");
const aActive   = document.getElementById("aActive");
const aBody     = document.getElementById("aBody");

const btnPublish = document.getElementById("btnPublish");
const btnClear   = document.getElementById("btnClear");
const stateText  = document.getElementById("stateText");

const list = document.getElementById("list");
const filterActive = document.getElementById("filterActive");

const activeCount = document.getElementById("activeCount");
const usersCount  = document.getElementById("usersCount");

const currentEmail = () => (localStorage.getItem("kb_user_email") || "");

/* ========= Helpers ========= */
function setState(msg, isError=false){
  stateText.textContent = msg;
  stateText.style.color = isError ? "rgba(239,68,68,.9)" : "rgba(234,240,255,.7)";
}

function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function fmtDate(ts){
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleString("ar-IQ", { dateStyle:"medium", timeStyle:"short" });
}

/* ========= Data ========= */
async function loadUsersCount(){
  try{
    const snap = await getDocs(collection(db, "users"));
    usersCount.textContent = snap.size;
    return snap.size;
  }catch(e){
    console.warn("users count error", e);
    usersCount.textContent = "—";
    return null;
  }
}

async function countSeen(announcementId){
  // count docs inside: announcements/{id}/seenBy
  const seenSnap = await getDocs(collection(db, "announcements", announcementId, "seenBy"));
  return seenSnap.size;
}

async function loadAnnouncements(){
  list.innerHTML = "";
  setState("جاري تحميل الإعلانات...");

  const totalUsers = await loadUsersCount();

  let qy = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
  const f = filterActive.value;
  if (f === "true")  qy = query(collection(db, "announcements"), where("active","==", true),  orderBy("createdAt","desc"));
  if (f === "false") qy = query(collection(db, "announcements"), where("active","==", false), orderBy("createdAt","desc"));

  const snap = await getDocs(qy);

  // active count
  let activeN = 0;
  snap.forEach(d => { if (d.data().active) activeN++; });
  activeCount.textContent = activeN;

  if (snap.empty){
    list.innerHTML = `<div class="item"><div class="meta">لا يوجد إعلانات بعد.</div></div>`;
    setState("لا يوجد إعلانات.");
    return;
  }

  const docs = snap.docs;

  // render
  for (const d of docs){
    const data = d.data();
    const id = d.id;

    const seen = await countSeen(id);
    const unseen = (typeof totalUsers === "number") ? Math.max(totalUsers - seen, 0) : "—";

    const activeBadge = data.active ? `<span class="badge active">Active</span>` : `<span class="badge inactive">Inactive</span>`;
    const prBadge = data.priority === "urgent" ? `<span class="badge urgent">Urgent</span>` : `<span class="badge">Normal</span>`;

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">
            <h3 style="margin:0;font-size:16px;font-weight:900">${escapeHtml(data.title || "")}</h3>
            ${activeBadge}
            ${prBadge}
          </div>
          <div class="meta">
            <span>👤 ${escapeHtml(data.authorName || "—")}</span>
            <span>✉️ ${escapeHtml(data.authorEmail || "—")}</span>
            <span>🕒 ${escapeHtml(fmtDate(data.createdAt) || "")}</span>
          </div>
        </div>

        <div class="rowBtns">
          <button class="smallBtn" data-act="toggle">${data.active ? "تعطيل" : "تفعيل"}</button>
          <button class="smallBtn" data-act="seen">من شاهد؟</button>
          <button class="smallBtn danger" data-act="del">حذف</button>
        </div>
      </div>

      <div class="itemBody">${escapeHtml(data.body || "").replace(/\n/g,"<br>")}</div>

      <div class="stats">
        <div class="stat">👁️ Seen: <b>${seen}</b></div>
        <div class="stat">🙈 Unseen: <b>${unseen}</b></div>
        <div class="stat">🧾 ID: <b>${id}</b></div>
      </div>
    `;

    // actions
    el.querySelector('[data-act="toggle"]').onclick = async () => {
      try{
        await updateDoc(doc(db, "announcements", id), { active: !data.active });
        setState("تم تحديث الحالة ✅");
        await loadAnnouncements();
      }catch(e){
        console.error(e);
        setState("فشل تحديث الحالة ❌", true);
      }
    };

    el.querySelector('[data-act="del"]').onclick = async () => {
      const ok = confirm("حذف الإعلان؟ (سيتم حذف الإعلان فقط، بيانات seenBy تبقى داخل المستند المحذوف عادةً تُحذف معه حسب Firestore).");
      if (!ok) return;
      try{
        await deleteDoc(doc(db, "announcements", id));
        setState("تم حذف الإعلان ✅");
        await loadAnnouncements();
      }catch(e){
        console.error(e);
        setState("فشل الحذف ❌", true);
      }
    };

    el.querySelector('[data-act="seen"]').onclick = async () => {
      try{
        const seenSnap = await getDocs(collection(db, "announcements", id, "seenBy"));
        if (seenSnap.empty){
          alert("لا أحد شاهد هذا الإعلان بعد.");
          return;
        }
        const names = [];
        seenSnap.forEach(s => {
          const d = s.data();
          names.push(`${d.userEmail || s.id} — ${d.seenAt?.toDate ? d.seenAt.toDate().toLocaleString("ar-IQ") : ""}`);
        });
        alert("✅ Seen By:\n\n" + names.join("\n"));
      }catch(e){
        console.error(e);
        alert("فشل قراءة seenBy");
      }
    };

    list.appendChild(el);
  }

  setState("تم التحميل ✅");
}

/* ========= Publish ========= */
btnClear.onclick = () => {
  aTitle.value = "";
  aBody.value = "";
  aAuthor.value = "";
  aPriority.value = "normal";
  aActive.value = "true";
  setState("تم مسح الحقول.");
};

btnPublish.onclick = async () => {
  const title = aTitle.value.trim();
  const body  = aBody.value.trim();
  const authorName = aAuthor.value.trim();
  const priority = aPriority.value;
  const active = (aActive.value === "true");

  if (!title || !body || !authorName){
    setState("أكمل: العنوان + المحتوى + اسم صاحب الإعلان.", true);
    return;
  }

  setState("جاري النشر...");

  try{
    await addDoc(collection(db, "announcements"), {
      title,
      body,
      authorName,
      authorEmail: currentEmail(),
      priority,
      active,
      createdAt: serverTimestamp()
    });

    setState("تم نشر الإعلان ✅");
    btnClear.click();
    await loadAnnouncements();
  }catch(e){
    console.error(e);
    setState("فشل النشر ❌ تحقق من Firebase.", true);
  }
};

/* ========= Init ========= */
(async function init(){
  const ok = await requireAdmin();
  if (!ok) return;

  filterActive.onchange = loadAnnouncements;
  await loadAnnouncements();
})();
