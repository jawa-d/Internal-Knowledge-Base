import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Animated Counter
================================ */
function animate(el, to) {
  let current = 0;
  const step = Math.max(1, Math.ceil(to / 40));

  const timer = setInterval(() => {
    current += step;
    if (current >= to) {
      el.textContent = to;
      clearInterval(timer);
    } else {
      el.textContent = current;
    }
  }, 25);
}

/* ===============================
   Chart Base Options (GLOBAL)
================================ */
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: "index",
    intersect: false
  },

  animation: {
    duration: 1200,
    easing: "easeOutQuart"
  },

  plugins: {
    legend: { display: false },

    tooltip: {
      enabled: true,
      backgroundColor: "#0f172a",
      titleColor: "#ffffff",
      bodyColor: "#e5e7eb",
      padding: 14,
      cornerRadius: 14,
      displayColors: false,

      callbacks: {
        label: (ctx) => {
          const value = ctx.parsed.y;
          const max = ctx.chart.scales.y.max || value;
          const percent = ((value / max) * 100).toFixed(1);
          return `القيمة: ${value} (${percent}%)`;
        }
      }
    }
  },

  scales: {
    x: {
      grid: { display: false }
    },
    y: {
      beginAtZero: true
    }
  }
};

/* ===============================
   Generic Line Chart
================================ */
function drawLineChart(canvasId, total, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [{
        data: [
          Math.max(1, total - 10),
          Math.max(1, total - 7),
          Math.max(1, total - 5),
          Math.max(1, total - 3),
          Math.max(1, total - 1),
          total
        ],
        borderColor: color,
        backgroundColor: color.replace("1)", "0.12)"),
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: "#fff",
        borderWidth: 2
      }]
    },
    options: baseOptions
  });
}

/* ===============================
   Build Exam Users Monthly Data
================================ */
function buildExamUsersChartData(attemptsSnap) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const map = {};
  months.forEach(m => map[m] = new Set());

  attemptsSnap.forEach(doc => {
    const d = doc.data();
    if (!d.createdAt || !d.userEmail) return;

    const month = d.createdAt.toDate().toLocaleString("en", { month: "short" });
    map[month]?.add(d.userEmail);
  });

  return months.map(m => map[m].size);
}

/* ===============================
   Logged User Info
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("loggedUserEmail");
  const userBox = document.getElementById("loggedUserBox");

  emailEl.textContent =
    localStorage.getItem("kb_user_email") || "Guest User";

  setTimeout(() => {
    userBox.style.opacity = "1";
  }, 100);
});

/* ===============================
   Load Dashboard Data
================================ */
async function loadDashboard() {

  const usersSnap    = await getDocs(collection(db, "users"));
  const shelvesSnap  = await getDocs(collection(db, "shelves"));
  const newsSnap     = await getDocs(collection(db, "news"));
  const kpiSnap      = await getDocs(collection(db, "kpi_reports"));
  const attemptsSnap = await getDocs(collection(db, "exam_attempts"));

  /* Counters */
  animate(usersCount, usersSnap.size);
  animate(shelvesCount, shelvesSnap.size);
  animate(newsCount, newsSnap.size);
  animate(kpiCount, kpiSnap.size);

  const uniqueExamUsers = new Set();
  attemptsSnap.forEach(d => d.data().userEmail && uniqueExamUsers.add(d.data().userEmail));
  animate(examUsersCount, uniqueExamUsers.size);

  /* Charts */
  drawLineChart("usersChart", usersSnap.size, "rgba(37,99,235,1)");
  drawLineChart("shelvesChart", shelvesSnap.size, "rgba(34,197,94,1)");
  drawLineChart("booksChart", shelvesSnap.size * 3, "rgba(99,102,241,1)");
  drawLineChart("kpiChart", kpiSnap.size, "rgba(245,158,11,1)");

  /* Exam users monthly */
  const monthly = buildExamUsersChartData(attemptsSnap);

  new Chart(document.getElementById("examUsersChart"), {
    type: "line",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{
        data: monthly,
        borderColor: "rgba(236,72,153,1)",
        backgroundColor: "rgba(236,72,153,0.12)",
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: baseOptions
  });
}

/* ===============================
   Logout
================================ */
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  if (!confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
  localStorage.clear();
  location.href = "login.html";
});

/* ===============================
   Init
================================ */
loadDashboard();
