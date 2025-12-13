// ================== Load Sidebar ==================
fetch("sidebar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("sidebar").innerHTML = html;

    // Get all menu items
    const items = document.querySelectorAll(".menu li");

    // Add click event
    items.forEach(li => {
      li.addEventListener("click", () => {
        window.location.href = li.dataset.page;
      });
    });

    // ==== Active Detection ====
    const current = window.location.pathname.split("/").pop();

    items.forEach(li => {
      if (li.dataset.page === current) {
        li.classList.add("active");
      }
    });
  })
  .catch(err => console.error("Sidebar Load Error:", err));
