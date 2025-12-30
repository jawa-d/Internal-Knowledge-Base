/* ===============================
   exam_builder.js ✅ FULL (Updated)
   - Active per section
   - Exam has its own section field
   ✅ NEW:
   - Upload image per question (Firebase Storage)
   - Show image preview inside question card
   - Delete image (from Storage + clear fields)
=============================== */
import { checkAccess } from "./security.js";
let currentEmail = "";

document.addEventListener("DOMContentLoaded", async () => {
  const allowed = await checkAccess(["admin"]);
  if (!allowed) return;

  // ✅ تحديث مهم
  currentEmail = localStorage.getItem("kb_user_email");

  if (!currentEmail) {
    alert("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
    location.href = "login.html";
    return;
  }

  // 👇 كود الصفحة الطبيعي هنا
});

import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ✅ NEW: Storage */
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";

const storage = getStorage();

/* ===============================
   UI
=============================== */
const examTitle = document.getElementById("examTitle");
const examDesc = document.getElementById("examDesc");
const durationMin = document.getElementById("durationMin");
const passScore = document.getElementById("passScore");
const examStatus = document.getElementById("examStatus");
const currentSection = document.getElementById("currentSection");

/* NEW ✅: Exam section selector */
const examSection = document.getElementById("examSection");

const btnNewExam = document.getElementById("btnNewExam");
const btnLoadActive = document.getElementById("btnLoadActive");
const btnSave = document.getElementById("btnSave");
const btnDelete = document.getElementById("btnDelete");
const btnAddQ = document.getElementById("btnAddQ");

const questionsWrap = document.getElementById("questionsWrap");
const hint = document.getElementById("hint");

/* ===============================
   State
=============================== */
let examId = "";
let examData = null;

function uid() {
  return "q_" + Math.random().toString(16).slice(2) + Date.now();
}

function normalizeQuestion(q) {
  const type = q.type || "tf";
  const defaultMode = (type === "essay" || type === "short") ? "manual" : "auto";
  return {
    id: q.id || uid(),
    section: q.section || "Inbound", // Question section
    type,
    title: q.title || "",
    points: Number(q.points ?? 10),
    correctionMode: q.correctionMode || defaultMode,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer ?? "",

    /* ✅ NEW: Image fields */
    imageUrl: q.imageUrl || "",
    imagePath: q.imagePath || ""
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===============================
   ✅ NEW Helpers (Image)
=============================== */
function safeFileName(name) {
  return String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 60);
}

async function uploadQuestionImage(file, qid) {
  if (!file) return { url: "", path: "" };

  if (!examId) {
    alert("⚠️ لازم تنشئ/تحمّل Exam أولاً قبل رفع صورة.");
    return { url: "", path: "" };
  }

  const extName = safeFileName(file.name);
  const path = `exam_question_images/${examId}/${qid}/${Date.now()}_${extName}`;
  const fileRef = sRef(storage, path);

  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  return { url, path };
}

async function deleteQuestionImage(path) {
  if (!path) return;
  const fileRef = sRef(storage, path);
  await deleteObject(fileRef);
}

/* ===============================
   ✅ Active per Section
=============================== */
async function deactivateOtherActiveExams(activeId, section) {
  const qy = query(
    collection(db, "exams"),
    where("status", "==", "active"),
    where("section", "==", section) // ✅ only same section
  );

  const snap = await getDocs(qy);
  const jobs = [];

  snap.forEach(d => {
    if (d.id !== activeId) {
      jobs.push(updateDoc(doc(db, "exams", d.id), { status: "closed" }));
    }
  });

  await Promise.all(jobs);
}

/* ===============================
   Render
=============================== */
function render() {
  questionsWrap.innerHTML = "";

  if (!examData) {
    hint.textContent = "لا يوجد Exam محمّل.";
    return;
  }

  // Normalize exam fields
  examData.section = examData.section || "Inbound"; // ✅ exam section
  examData.questions = (examData.questions || []).map(normalizeQuestion);

  hint.textContent =
    `ExamID: ${examId} | Section: ${examData.section} | Status: ${examData.status || "draft"} | Questions: ${examData.questions.length}`;

  examData.questions.forEach((q, idx) => {
    const el = document.createElement("div");
    el.className = "qcard";

    el.innerHTML = `
      <div class="qtop">
        <div class="badges">
          <span class="badge">#${idx + 1}</span>
          <span class="badge">${escapeHtml(q.section)}</span>
          <span class="small">ID: ${q.id}</span>
        </div>
        <button class="btn danger qDel" type="button">حذف</button>
      </div>

      <div class="qgrid">
        <div class="field">
          <label>نص السؤال</label>
          <input class="qTitle" value="${escapeHtml(q.title)}" placeholder="اكتب السؤال...">
        </div>

        <div class="field">
          <label>نوع السؤال</label>
          <select class="qType">
            <option value="tf" ${q.type === "tf" ? "selected" : ""}>True/False</option>
            <option value="mcq" ${q.type === "mcq" ? "selected" : ""}>MCQ</option>
            <option value="short" ${q.type === "short" ? "selected" : ""}>Short</option>
            <option value="essay" ${q.type === "essay" ? "selected" : ""}>Essay</option>
          </select>
        </div>

        <div class="field">
          <label>نوع التصحيح</label>
          <select class="qMode">
            <option value="auto" ${q.correctionMode === "auto" ? "selected" : ""}>تلقائي</option>
            <option value="manual" ${q.correctionMode === "manual" ? "selected" : ""}>يدوي</option>
          </select>
        </div>

        <div class="field">
          <label>درجة السؤال</label>
          <input class="qPoints" type="number" min="1" value="${q.points}">
        </div>
      </div>

      <!-- ✅ NEW: Image block -->
      <div class="hr"></div>
      <div class="qimgBox"></div>

      <div class="hr"></div>
      <div class="opts"></div>
    `;

    const optsBox = el.querySelector(".opts");
    const typeSel = el.querySelector(".qType");
    const modeSel = el.querySelector(".qMode");
    const imgBox  = el.querySelector(".qimgBox");

    /* ✅ NEW: Render image UI */
    function renderImageBox() {
      const qq = examData.questions[idx];

      const hasImage = !!qq.imageUrl;
      imgBox.innerHTML = `
        <div class="field" style="margin-top:4px">
          <label>صورة السؤال (اختياري)</label>

          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center">
            <input class="qImgInput" type="file" accept="image/*" />

            <button class="btn qImgDelete" type="button"
              style="background:#ef4444;color:#fff; display:${hasImage ? "inline-flex" : "none"}; align-items:center; gap:8px;">
              حذف الصورة
            </button>

            <span class="small qImgHint" style="color:#64748b"></span>
          </div>

          <div class="qImgPreviewWrap" style="margin-top:10px; display:${hasImage ? "block" : "none"};">
            <img class="qImgPreview" src="${hasImage ? escapeHtml(qq.imageUrl) : ""}"
              style="max-width:100%; height:auto; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 10px 26px rgba(2,6,23,.08);" />
          </div>
        </div>
      `;

      const fileInput = imgBox.querySelector(".qImgInput");
      const delBtn = imgBox.querySelector(".qImgDelete");
      const hintEl = imgBox.querySelector(".qImgHint");

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        // basic validation
        if (!String(file.type || "").startsWith("image/")) {
          alert("⚠️ الرجاء اختيار ملف صورة فقط.");
          fileInput.value = "";
          return;
        }
        if (file.size > 6 * 1024 * 1024) {
          alert("⚠️ حجم الصورة كبير. الحد 6MB.");
          fileInput.value = "";
          return;
        }

        hintEl.textContent = "…جاري رفع الصورة";
        fileInput.disabled = true;

        try {
          // if previous image exists, delete it first (optional clean)
          if (qq.imagePath) {
            try { await deleteQuestionImage(qq.imagePath); } catch (_) {}
          }

          const { url, path } = await uploadQuestionImage(file, qq.id);
          if (!url) {
            hintEl.textContent = "⚠️ لم يتم الرفع";
            fileInput.disabled = false;
            return;
          }

          qq.imageUrl = url;
          qq.imagePath = path;

          hintEl.textContent = "✅ تم رفع الصورة";
          render(); // re-render to show preview
        } catch (e) {
          console.error(e);
          hintEl.textContent = "⚠️ فشل رفع الصورة";
          fileInput.disabled = false;
        }
      });

      delBtn?.addEventListener("click", async () => {
        const qq = examData.questions[idx];
        if (!qq.imageUrl && !qq.imagePath) return;

        if (!confirm("حذف الصورة من السؤال؟")) return;

        delBtn.disabled = true;
        hintEl.textContent = "…جاري حذف الصورة";

        try {
          if (qq.imagePath) {
            await deleteQuestionImage(qq.imagePath);
          }
          qq.imageUrl = "";
          qq.imagePath = "";
          hintEl.textContent = "✅ تم حذف الصورة";
          render();
        } catch (e) {
          console.error(e);
          hintEl.textContent = "⚠️ فشل حذف الصورة";
          delBtn.disabled = false;
        }
      });
    }

    renderImageBox();

    function renderOptions() {
      const t = examData.questions[idx].type;
      const m = examData.questions[idx].correctionMode;

      optsBox.innerHTML = "";

      if (t === "mcq") {
        if (!examData.questions[idx].options || !examData.questions[idx].options.length) {
          examData.questions[idx].options = ["", "", "", ""];
        }

        optsBox.innerHTML = `
          <div class="field">
            <label>خيارات MCQ</label>
            ${examData.questions[idx].options.map((o, i) => `
              <div class="optRow">
                <input class="opt" data-i="${i}" value="${escapeHtml(o)}" placeholder="خيار ${i + 1}">
              </div>
            `).join("")}
          </div>

          <div class="row">
            <button class="btn addOpt" type="button">+ خيار</button>
            <button class="btn delOpt" type="button" style="background:#fecaca">- خيار</button>

            <div class="field" style="min-width:260px">
              <label>الإجابة الصحيحة (إذا تلقائي)</label>
              <input class="qCorrect" value="${escapeHtml(examData.questions[idx].correctAnswer)}" placeholder="اكتب نص الخيار الصحيح">
            </div>

            <div class="field" style="min-width:220px">
              <label>ملاحظة</label>
              <input value="${m === "manual" ? "يدوي" : "تلقائي"}" disabled>
            </div>
          </div>
        `;
      } else if (t === "tf") {
        optsBox.innerHTML = `
          <div class="row">
            <div class="field" style="min-width:260px">
              <label>الإجابة الصحيحة (إذا تلقائي)</label>
              <select class="qCorrect">
                <option value="true" ${String(examData.questions[idx].correctAnswer) === "true" ? "selected" : ""}>True</option>
                <option value="false" ${String(examData.questions[idx].correctAnswer) === "false" ? "selected" : ""}>False</option>
              </select>
            </div>
            <div class="field" style="min-width:220px">
              <label>ملاحظة</label>
              <input value="${m === "manual" ? "يدوي" : "تلقائي"}" disabled>
            </div>
          </div>
        `;
      } else {
        optsBox.innerHTML = `
          <div class="row">
            <div class="field" style="min-width:420px">
              <label>إجابة نموذجية (اختياري)</label>
              <input class="qCorrect" value="${escapeHtml(examData.questions[idx].correctAnswer)}" placeholder="للإرشاد فقط">
            </div>
            <div class="field" style="min-width:220px">
              <label>ملاحظة</label>
              <input value="${m === "manual" ? "يدوي" : "تلقائي"}" disabled>
            </div>
          </div>
        `;
      }
    }

    renderOptions();

    // Delete question
    el.querySelector(".qDel").onclick = async () => {
      // ✅ NEW: if question has image, optionally delete from storage
      const qq = examData.questions[idx];
      if (qq?.imagePath) {
        try { await deleteQuestionImage(qq.imagePath); } catch (_) {}
      }

      examData.questions.splice(idx, 1);
      render();
    };

    // Update question fields
    el.querySelector(".qTitle").addEventListener("input", (e) => {
      examData.questions[idx].title = e.target.value;
    });

    el.querySelector(".qPoints").addEventListener("input", (e) => {
      examData.questions[idx].points = Number(e.target.value || 1);
    });

    typeSel.addEventListener("change", () => {
      const v = typeSel.value;
      examData.questions[idx].type = v;
      if (v === "essay" || v === "short") examData.questions[idx].correctionMode = "manual";
      render();
    });

    modeSel.addEventListener("change", () => {
      examData.questions[idx].correctionMode = modeSel.value;
      renderOptions();
    });

    // Options input
    optsBox.addEventListener("input", (e) => {
      if (e.target.classList.contains("opt")) {
        const i = Number(e.target.dataset.i);
        examData.questions[idx].options[i] = e.target.value;
      }
      if (e.target.classList.contains("qCorrect")) {
        examData.questions[idx].correctAnswer = e.target.value;
      }
    });

    optsBox.addEventListener("change", (e) => {
      if (e.target.classList.contains("qCorrect")) {
        examData.questions[idx].correctAnswer = e.target.value;
      }
    });

    optsBox.addEventListener("click", (e) => {
      if (e.target.classList.contains("addOpt")) {
        examData.questions[idx].options.push("");
        render();
      }
      if (e.target.classList.contains("delOpt")) {
        examData.questions[idx].options.pop();
        render();
      }
    });

    questionsWrap.appendChild(el);
  });
}

/* ===============================
   CRUD
=============================== */
btnNewExam.onclick = async () => {
  const title = examTitle.value.trim();
  if (!title) return alert("اكتب عنوان الامتحان");

  const sec = examSection?.value || "Inbound";

  const ref = await addDoc(collection(db, "exams"), {
    title,
    description: examDesc.value.trim(),
    durationMin: Number(durationMin.value || 20),
    passScore: Number(passScore.value || 60),
    status: examStatus.value || "draft",
    section: sec, // ✅ NEW
    questions: [],
    createdAt: serverTimestamp(),
    createdBy: currentEmail
  });

  examId = ref.id;
  examData = {
    title,
    description: examDesc.value.trim(),
    durationMin: Number(durationMin.value || 20),
    passScore: Number(passScore.value || 60),
    status: examStatus.value || "draft",
    section: sec, // ✅ NEW
    questions: []
  };

  render();
};

btnLoadActive.onclick = async () => {
  const sec = examSection?.value || "Inbound";

  // ⬅️ تحميل كل الحالات (draft / active / closed)
  const qy = query(
    collection(db, "exams"),
    where("section", "==", sec)
  );

  const snap = await getDocs(qy);
  if (snap.empty) {
    alert(`لا يوجد امتحانات لهذا القسم: ${sec}`);
    return;
  }

  // ⬅️ اختيار أحدث امتحان
  const best = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      (b.updatedAt?.seconds || b.createdAt?.seconds || 0) -
      (a.updatedAt?.seconds || a.createdAt?.seconds || 0)
    )[0];

  examId = best.id;
  examData = best;

  // تعبئة الفورم
  examTitle.value = examData.title || "";
  examDesc.value = examData.description || "";
  durationMin.value = examData.durationMin ?? 20;
  passScore.value = examData.passScore ?? 60;
  examStatus.value = examData.status || "draft";

  if (examSection) {
    examSection.value = examData.section || sec;
  }

  render();
};

btnAddQ.onclick = () => {
  if (!examData) return alert("أنشئ أو حمّل امتحان أولاً");

  const sec = currentSection.value || "Inbound";

  examData.questions = (examData.questions || []).map(normalizeQuestion);
  examData.questions.push(normalizeQuestion({
    section: sec,
    type: "tf",
    correctionMode: "auto",
    points: 1,
    correctAnswer: "true",
    title: ""
  }));

  render();
};

btnSave.onclick = async () => {
  if (!examId || !examData) return;

  examData.title = examTitle.value.trim();
  examData.description = examDesc.value.trim();
  examData.durationMin = Number(durationMin.value || 20);
  examData.passScore = Number(passScore.value || 60);
  examData.status = examStatus.value || "draft";
  examData.section = examSection?.value || examData.section || "Inbound"; // ✅ NEW
  examData.questions = (examData.questions || []).map(normalizeQuestion);

  // ✅ only deactivate active exams in same section
  if (examData.status === "active") {
    await deactivateOtherActiveExams(examId, examData.section);
  }

  await updateDoc(doc(db, "exams", examId), {
    title: examData.title,
    description: examData.description,
    durationMin: examData.durationMin,
    passScore: examData.passScore,
    status: examData.status,
    section: examData.section, // ✅ NEW
    questions: examData.questions,
    updatedAt: serverTimestamp(),
    updatedBy: currentEmail
  });

  alert("✅ تم حفظ الامتحان");
  render();
};

btnDelete.onclick = async () => {
  if (!examId) return;
  if (!confirm("حذف الامتحان؟")) return;

  await deleteDoc(doc(db, "exams", examId));
  examId = "";
  examData = null;
  questionsWrap.innerHTML = "";
  hint.textContent = "تم حذف الامتحان.";
  alert("✅ تم الحذف");
};

render();
