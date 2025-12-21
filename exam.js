import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocsFromServer,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* Auth */
const email = localStorage.getItem("kb_user_email");
if (!email) location.href="login.html";

/* Elements */
const examTitleEl = document.getElementById("examTitle");
const examDescEl  = document.getElementById("examDesc");
const timerEl     = document.getElementById("timer");
const identityBox = document.getElementById("identityBox");
const examBox     = document.getElementById("examBox");
const questionsEl = document.getElementById("questions");
const empNameEl   = document.getElementById("empName");
const empIdEl     = document.getElementById("empId");
const btnEnter    = document.getElementById("btnEnter");
const btnSave     = document.getElementById("btnSave");

let exam=null;
let attemptRef=null;
let answers={};
let endAt=0;
let timerInterval=null;

/* Load Exam */
async function loadActiveExam(){
  const q=query(collection(db,"exams"),where("status","==","active"));
  const snap=await getDocsFromServer(q);

  if(snap.empty){
    identityBox.innerHTML="⚠️ لا يوجد امتحان حاليًا";
    btnEnter.disabled=true;
    return;
  }

  exam=snap.docs.map(d=>({id:d.id,...d.data()}))[0];
  examTitleEl.textContent=exam.title;
  examDescEl.textContent=exam.description;
}

/* Enter */
btnEnter.onclick=async()=>{
  const name=empNameEl.value.trim();
  const empId=empIdEl.value.trim();
  if(!name||!empId)return alert("أدخل البيانات");

  const id=`${exam.id}_${empId}`;
  attemptRef=doc(db,"exam_attempts",id);

  if((await getDoc(attemptRef)).exists()){
    alert("❌ لا يمكن إعادة الامتحان");
    return;
  }

  await setDoc(attemptRef,{
    examId:exam.id,
    employeeName:name,
    employeeId:empId,
    email,
    answers:{},
    status:"started",
    startedAt:serverTimestamp()
  });

  identityBox.style.display="none";
  examBox.style.display="block";

  renderQuestions();
  startTimer();
};

/* Render Questions */
function renderQuestions(){
  questionsEl.innerHTML="";
  answers={};

  exam.questions.forEach((q,i)=>{
    const card=document.createElement("div");
    card.className="question-card";

    card.innerHTML=`
      <div class="q-header">
        <div class="q-number">${i+1}</div>
        <div class="q-title">${q.title}</div>
      </div>
      <div class="q-body"></div>
    `;

    const body=card.querySelector(".q-body");

    if(q.type==="mcq"){
      q.options.forEach(opt=>{
        body.innerHTML+=`
          <label class="option">
            <input type="radio" name="${q.id}" value="${opt}">
            <span>${opt}</span>
          </label>
        `;
      });
    }
    else if(q.type==="tf"){
      body.innerHTML+=`
        <label class="option"><input type="radio" name="${q.id}" value="true"> صح</label>
        <label class="option"><input type="radio" name="${q.id}" value="false"> خطأ</label>
      `;
    }
    else{
      body.innerHTML+=`<textarea class="text-answer"></textarea>`;
    }

    card.addEventListener("change",()=>{
      const checked=card.querySelector("input:checked");
      if(checked)answers[q.id]=checked.value;
      const ta=card.querySelector("textarea");
      if(ta)answers[q.id]=ta.value;
    });

    questionsEl.appendChild(card);
  });
}

/* Timer */
function startTimer(){
  endAt=Date.now()+exam.durationMin*60000;
  timerInterval=setInterval(()=>{
    const diff=endAt-Date.now();
    if(diff<=0){
      clearInterval(timerInterval);
      submitExam();
    }
    timerEl.textContent=
      Math.floor(diff/60000)+":"+
      String(Math.floor((diff%60000)/1000)).padStart(2,"0");
  },1000);
}

/* Submit */
btnSave.onclick=()=>submitExam();

async function submitExam(){
  await updateDoc(attemptRef,{
    answers,
    status:"submitted",
    submittedAt:serverTimestamp()
  });
  document.getElementById("finishPopup").style.display="flex";
}

/* Init */
await loadActiveExam();
