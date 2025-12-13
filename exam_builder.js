const QUESTIONS_KEY = "kb_exam_questions";

let questions = [];
let editingId = null;

// DOM
const questionsList = document.getElementById("questionsList");
const countLabel = document.getElementById("countLabel");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const qTextInput = document.getElementById("qText");
const qTypeSelect = document.getElementById("qType");
const qManualCheckbox = document.getElementById("qManual");
const choicesBox = document.getElementById("choicesBox");
const opt1Input = document.getElementById("opt1");
const opt2Input = document.getElementById("opt2");
const opt3Input = document.getElementById("opt3");
const opt4Input = document.getElementById("opt4");
const correctIndexInput = document.getElementById("correctIndex");
const addQuestionBtn = document.getElementById("addQuestionBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

// تحميل الأسئلة
function loadQuestions() {
  questions = JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "[]");
}

// حفظ الأسئلة
function saveQuestions() {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

// عرض الأسئلة
function renderQuestions() {
  questionsList.innerHTML = "";
  countLabel.textContent = questions.length;

  if (questions.length === 0) {
    questionsList.innerHTML = `<p style="font-size:13px;color:#6b7280;">لا توجد أسئلة بعد. اضغط على "إضافة سؤال جديد".</p>`;
    return;
  }

  questions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "q-card";

    const header = document.createElement("div");
    header.className = "q-card-header";

    const left = document.createElement("div");
    left.innerHTML = `<b>${index + 1}) ${q.text}</b>`;

    const tags = document.createElement("div");
    tags.className = "q-tags";

    const typeTag = document.createElement("span");
    typeTag.className = "tag";
    typeTag.textContent = q.type === "choice" ? "اختيارات" : "نصي";
    tags.appendChild(typeTag);

    if (q.manual) {
      const mTag = document.createElement("span");
      mTag.className = "tag manual";
      mTag.textContent = "Manual";
      tags.appendChild(mTag);
    } else {
      const aTag = document.createElement("span");
      aTag.className = "tag";
      aTag.textContent = "Auto";
      tags.appendChild(aTag);
    }

    header.appendChild(left);
    header.appendChild(tags);

    const body = document.createElement("div");
    if (q.type === "choice" && q.options && q.options.length > 0) {
      const optsText = q.options.map((opt, i) => `${i + 1}) ${opt}`).join(" | ");
      const correct = typeof q.correctIndex === "number" ? q.correctIndex + 1 : "-";
      body.innerHTML = `
        <p style="margin:4px 0;">${optsText}</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">الإجابة الصحيحة: ${correct}</p>
      `;
    } else {
      body.innerHTML = `<p style="margin:4px 0;font-size:13px;color:#6b7280;">سؤال نصي يُصحّح يدويًا أو بناء على المنهج.</p>`;
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.style.marginTop = "6px";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "تعديل";
    editBtn.onclick = () => openEditQuestion(q.id);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.textContent = "حذف";
    delBtn.onclick = () => deleteQuestion(q.id);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);

    questionsList.appendChild(card);
  });
}

// فتح popup لإضافة سؤال جديد
function openAddQuestion() {
  editingId = null;
  popupTitle.textContent = "إضافة سؤال جديد";
  qTextInput.value = "";
  qTypeSelect.value = "choice";
  qManualCheckbox.checked = false;
  opt1Input.value = "";
  opt2Input.value = "";
  opt3Input.value = "";
  opt4Input.value = "";
  correctIndexInput.value = "";

  choicesBox.style.display = "block";
  popup.style.display = "flex";
}

// فتح popup لتعديل سؤال موجود
function openEditQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;

  editingId = id;
  popupTitle.textContent = "تعديل السؤال";

  qTextInput.value = q.text;
  qTypeSelect.value = q.type;
  qManualCheckbox.checked = !!q.manual;

  if (q.type === "choice") {
    choicesBox.style.display = "block";
    opt1Input.value = q.options?.[0] || "";
    opt2Input.value = q.options?.[1] || "";
    opt3Input.value = q.options?.[2] || "";
    opt4Input.value = q.options?.[3] || "";
    correctIndexInput.value =
      typeof q.correctIndex === "number" ? (q.correctIndex + 1).toString() : "";
  } else {
    choicesBox.style.display = "none";
    opt1Input.value = "";
    opt2Input.value = "";
    opt3Input.value = "";
    opt4Input.value = "";
    correctIndexInput.value = "";
  }

  popup.style.display = "flex";
}

// حذف سؤال
function deleteQuestion(id) {
  if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
  questions = questions.filter(q => q.id !== id);
  saveQuestions();
  renderQuestions();
}

// حفظ (إضافة / تعديل)
function saveQuestion() {
  const text = qTextInput.value.trim();
  const type = qTypeSelect.value;
  const manual = qManualCheckbox.checked;

  if (!text) {
    alert("يرجى إدخال نص السؤال.");
    return;
  }

  let newQ = {
    id: editingId || Date.now(),
    text,
    type,
    manual
  };

  if (type === "choice") {
    const opts = [
      opt1Input.value.trim(),
      opt2Input.value.trim(),
      opt3Input.value.trim(),
      opt4Input.value.trim()
    ].filter(x => x !== "");

    if (opts.length < 2) {
      alert("يرجى إدخال خيارين على الأقل.");
      return;
    }

    const correct = Number(correctIndexInput.value);
    if (isNaN(correct) || correct < 1 || correct > opts.length) {
      alert("رقم الإجابة الصحيحة يجب أن يكون بين 1 و " + opts.length);
      return;
    }

    newQ.options = opts;
    newQ.correctIndex = correct - 1;
  }

  if (editingId) {
    const idx = questions.findIndex(q => q.id === editingId);
    if (idx !== -1) {
      questions[idx] = newQ;
    }
  } else {
    questions.push(newQ);
  }

  saveQuestions();
  renderQuestions();
  closePopup();
}

// إغلاق البوب أب
function closePopup() {
  popup.style.display = "none";
}

// تبديل عرض خيارات الاختيار حسب نوع السؤال
qTypeSelect.addEventListener("change", () => {
  if (qTypeSelect.value === "choice") {
    choicesBox.style.display = "block";
  } else {
    choicesBox.style.display = "none";
  }
});

// ربط الأحداث
addQuestionBtn.addEventListener("click", openAddQuestion);
saveBtn.addEventListener("click", saveQuestion);
cancelBtn.addEventListener("click", closePopup);

// تهيئة
function initBuilder() {
  loadQuestions();
  renderQuestions();
}

initBuilder();
