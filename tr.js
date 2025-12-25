import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { checkAccess } from "./security.js";

document.addEventListener("DOMContentLoaded", async () => {
  const allowed = await checkAccess(["admin"]);
  if (!allowed) return;

  // 👇 كود الصفحة الطبيعي هنا
});

/* UI */
openForm.onclick = () => formCard.classList.toggle("hidden");

/* Save */
saveBtn.onclick = async () => {

  const v_empId  = document.getElementById("empId").value.trim();
  const v_name   = document.getElementById("name").value.trim();
  const v_ph     = document.getElementById("ph").value.trim();
  const v_date   = document.getElementById("date").value;
  const v_status = document.getElementById("status").value;
  const v_dep    = document.getElementById("dep").value || ""; // ✅ اختياري

  // تحقق
  if (!v_empId || !v_name || !v_ph || !v_date || v_status === "") {
    alert("❗ أكمل جميع الحقول المطلوبة");
    return;
  }

  await addDoc(collection(db,"tr_employees"),{
    empId: v_empId,
    name: v_name,
    ph: v_ph,
    date: v_date,
    status: v_status,
    dep: v_dep,          // ممكن تكون ""
    tasks: [],
    createdAt: serverTimestamp()
  });

  location.href = "tr_report.html";
};
