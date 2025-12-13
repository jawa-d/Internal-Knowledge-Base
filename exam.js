/* ===========================
     إعدادات أساسية
=========================== */
const TOTAL_TIME = 30 * 60; 
let remainingTime = TOTAL_TIME;
let timerInterval = null;
let currentIndex = 0;
let examStarted = false;
let examLocked = false;

const RESULTS_KEY = "kb_exam_results";
const QUESTIONS_KEY = "kb_exam_questions";

let questions = [];

/* ===========================
     تحميل الأسئلة
=========================== */
function loadQuestions() {
  const stored = JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "[]");

  if (stored.length > 0) {
    questions = stored;
  } else {
    questions = [
      {
        id: 1,
        text: "ما الهدف الأساسي من الـ Knowledge Base؟",
        type: "choice",
        options: ["تقليل الموظفين","تسريع الوصول للمعلومة","زيادة التكاليف","تقليل الفروع"],
        correctIndex: 1,
        manual: false
      },
      {
        id: 2,
        text: "اذكر مثالاً على مقالة جيدة.",
        type: "text",
        manual: true
      }
    ];
  }
}

/* ===========================
    عناصر الصفحة
=========================== */
const employeeNameInput = document.getElementById("employeeName");
const startBtn = document.getElementById("startExamBtn");
const questionsArea = document.getElementById("questionsArea");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const stepIndicator = document.getElementById("stepIndicator");
const submitBtn = document.getElementById("submitExamBtn");
const resultBox = document.getElementById("resultBox");
const timerCircle = document.getElementById("timerCircle");
const timerLabel = document.getElementById("timerLabel");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

/* ===========================
    بدء الامتحان
=========================== */
function initExam() {
  loadQuestions();

  const storedResults = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  if (storedResults.length > 0) {
    examLocked = true;
    lockExamUI("لقد أجريت الامتحان سابقًا.");
  }

  renderQuestions();
  updateStepUI();
  updateProgress();
  updateTimerCircle(1);
}

function renderQuestions() {
  questionsArea.innerHTML = "";

  questions.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = "question-card";
    if (index === 0) card.classList.add("active");

    card.innerHTML += `<p class="question-title">${index + 1}) ${q.text}</p>`;

    if (q.type === "choice") {
      q.options.forEach((opt, i) => {
        card.innerHTML += `
          <label class="choice-row">
            <input type="radio" name="q_${q.id}" value="${i}">
            <span>${opt}</span>
          </label>
        `;
      });
    } else {
      card.innerHTML += `
        <textarea class="short-answer-input" name="q_${q.id}" placeholder="اكتب إجابتك..."></textarea>
      `;
    }

    card.innerHTML += `
      <div class="question-meta">
        ${q.manual ? "📝 سؤال يدوي التصحيح" : "✅ سؤال تلقائي التصحيح"}
      </div>
    `;

    questionsArea.appendChild(card);
  });

  progressText.textContent = `1 / ${questions.length}`;
}

/* ===========================
      المؤقت
=========================== */
function startTimer() {
  remainingTime = TOTAL_TIME;
  updateTimerLabel();
  updateTimerCircle(1);

  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerLabel();
    updateTimerCircle(remainingTime / TOTAL_TIME);

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      autoSubmitOnTime();
    }
  }, 1000);
}

function updateTimerLabel() {
  const m = Math.floor(remainingTime / 60);
  const s = remainingTime % 60;
  timerLabel.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateTimerCircle(ratio) {
  const deg = ratio * 360;
  timerCircle.style.background = `conic-gradient(#22c55e ${deg}deg, #e5e7eb 0deg)`;
}

/* ===========================
   التنقّل
=========================== */
function updateProgress() {
  const percent = ((currentIndex + 1) / questions.length) * 100;
  progressFill.style.width = percent + "%";
  progressText.textContent = `${currentIndex + 1} / ${questions.length}`;
}

function updateStepUI() {
  const cards = document.querySelectorAll(".question-card");
  cards.forEach((card, i) => {
    card.classList.toggle("active", i === currentIndex);
  });

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === questions.length - 1;

  stepIndicator.textContent = `سؤال ${currentIndex + 1} من ${questions.length}`;
}

/* ===========================
   أزرار التنقل
=========================== */
nextBtn.onclick = () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    updateStepUI();
    updateProgress();
  }
};

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateStepUI();
    updateProgress();
  }
};

/* ===========================
   زر بدء الامتحان
=========================== */
startBtn.addEventListener("click", () => {
  if (examLocked) {
    showMessage("لا يمكن إعادة الامتحان.", "error");
    return;
  }

  if (!employeeNameInput.value.trim()) {
    showMessage("يرجى إدخال اسم الموظف.", "error");
    return;
  }

  examStarted = true;
  startBtn.disabled = true;
  startBtn.textContent = "الامتحان بدأ...";
  startTimer();

  showMessage("تم بدء الامتحان ✔", "success");
});

/* ===========================
   زر تسليم الامتحان
=========================== */
submitBtn.onclick = () => {
  if (!examStarted || examLocked) return;
  submitExam(false);
};

/* ===========================
   تسليم تلقائي
=========================== */
function autoSubmitOnTime() {
  if (!examStarted || examLocked) return;
  submitExam(true);
}

/* ===========================
   تنفيذ التسليم
=========================== */
function submitExam(isAuto) {
  clearInterval(timerInterval);

  const name = employeeNameInput.value.trim() || "غير معروف";
  const usedTime = TOTAL_TIME - remainingTime;

  let autoScore = 0;
  let manualScoreTotal = 0;

  const answers = [];

  questions.forEach(q => {
    const domName = `q_${q.id}`;
    let userAnswer = "";

    if (q.type === "choice") {
      const checked = document.querySelector(`input[name="${domName}"]:checked`);
      const idx = checked ? Number(checked.value) : -1;

      userAnswer = checked ? q.options[idx] : "—";

      const isCorrect = idx === q.correctIndex;

      if (!q.manual) {
        autoScore += isCorrect ? 10 : 0;
      }

      answers.push({
        questionId: q.id,
        text: q.text,
        type: q.type,
        userAnswer,
        correctAnswer: q.options[q.correctIndex],
        autoCorrect: !q.manual ? isCorrect : null,
        manual: q.manual,
        manualScore: q.manual ? null : 0
      });

    } else {
      const field = document.querySelector(`textarea[name="${domName}"]`);
      userAnswer = field.value.trim() || "—";

      answers.push({
        questionId: q.id,
        text: q.text,
        type: q.type,
        userAnswer,
        correctAnswer: null,
        autoCorrect: null,
        manual: true,
        manualScore: null
      });
    }
  });

  const resultObj = {
    id: Date.now(),
    employeeName: name,
    submittedAt: new Date().toISOString(),
    usedSeconds: usedTime,
    autoScore,
    manualScore: 0,
    finalScore: autoScore, 
    answers
  };

  const stored = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  stored.push(resultObj);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(stored));

  examLocked = true;
  lockExamUI("تم تسليم الامتحان بنجاح");

  showMessage(`تم التسليم. نتيجة الأسئلة التلقائية: ${autoScore}`, "success");
}

/* ===========================
   إقفال الصفحة
=========================== */
function lockExamUI(msg) {
  submitBtn.disabled = true;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  startBtn.disabled = true;

  const inputs = document.querySelectorAll("input, textarea");
  inputs.forEach(i => (i.disabled = true));

  showMessage(msg, "locked");
}

/* ===========================
   الرسائل
=========================== */
function showMessage(text, type) {
  resultBox.style.display = "block";
  resultBox.className = "result-box " + type;
  resultBox.textContent = text;
}

/* تشغيل */
initExam();
