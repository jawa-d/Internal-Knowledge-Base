// حماية الصفحة
if (localStorage.getItem("kb_logged_in") !== "1") {
  window.location.href = "login.html";
}

// عرض اسم المستخدم
const userEmail = localStorage.getItem("kb_user_email");
document.getElementById("currentUser").textContent =
  userEmail ? userEmail.split("@")[0] : "Unknown";

// زر تسجيل الخروج
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("kb_logged_in");
  localStorage.removeItem("kb_user_email");
  window.location.href = "login.html";
});

// تحريك الأرقام
const counters = document.querySelectorAll(".stat-number");

counters.forEach(counter => {
  const update = () => {
    const target = +counter.getAttribute("data-target");
    const current = +counter.innerText;

    const increment = target / 60;

    if (current < target) {
      counter.innerText = Math.ceil(current + increment);
      setTimeout(update, 20);
    } else {
      counter.innerText = target;
    }
  };

  update();
});
