/* ===============================
  Announcement Popup (BROADCAST MODE)
  - Show latest active announcement to EVERYONE
  - No login required
  - No seenBy
  - No localStorage
=============================== */

import { db } from "./firebase.js";
import {
  collection, getDocs,
  query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ========= Utils ========= */
function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function fmtDate(ts){
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString("ar-IQ", { dateStyle:"medium", timeStyle:"short" });
}

function ensureStyles(){
  if (document.getElementById("annPopupCssLinked")) return;

  const link = document.createElement("link");
  link.id = "annPopupCssLinked";
  link.rel = "stylesheet";
  link.href = "announcement_popup.css";
  document.head.appendChild(link);
}

function buildPopup(){
  if (document.getElementById("annOverlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "annOverlay";
  overlay.id = "annOverlay";

  overlay.innerHTML = `
    <div class="annModal">
      <div class="annHead">
        <div class="annBrand">
          <div class="annIcon">🔔</div>
          <div class="annTitleWrap">
            <h3>Announcement</h3>
            <p>Internal Knowledge Base</p>
          </div>
        </div>
        <button class="annClose" id="annCloseBtn">✕</button>
      </div>

      <div class="annBody">
        <h2 class="annMainTitle" id="annMainTitle"></h2>
        <div class="annMeta" id="annMeta"></div>
        <div class="annText" id="annText"></div>
      </div>

      <div class="annFoot">
        <button class="annBtn primary" id="annOkBtn">تم الإطلاع</button>
        <div class="annHint">هذا إعلان عام يظهر لكل المستخدمين</div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("annCloseBtn").onclick = hidePopup;
  document.getElementById("annOkBtn").onclick = hidePopup;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hidePopup();
  });
}

function showPopup(){
  document.getElementById("annOverlay").classList.add("show");
}

function hidePopup(){
  document.getElementById("annOverlay").classList.remove("show");
}

/* ========= MAIN ========= */
export async function runAnnouncementPopup(){
  try{
    ensureStyles();
    buildPopup();

   const qy = query(
  collection(db, "announcements"),
  where("active","==", true),
  limit(1)
  
);



    const snap = await getDocs(qy);
    if (snap.empty) return;

    const ann = snap.docs[0].data();

    // Fill content
    document.getElementById("annMainTitle").textContent = ann.title || "Announcement";

    const meta = [];
    if (ann.authorName) meta.push(`👤 ${escapeHtml(ann.authorName)}`);
    if (ann.createdAt) meta.push(`🕒 ${escapeHtml(fmtDate(ann.createdAt))}`);
    if (ann.priority === "urgent") meta.push(`⚠️ Urgent`);

    document.getElementById("annMeta").innerHTML =
      meta.map(m => `<span class="tag">${m}</span>`).join("");

    document.getElementById("annText").textContent = ann.body || "";

    showPopup();

  }catch(e){
    console.error("Announcement Popup Error:", e);
  }
}
