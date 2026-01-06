const form = document.getElementById("reportForm");
const successMsg = document.getElementById("successMsg");
const errorMsg = document.getElementById("errorMsg");

// 🔴 ضع رابط Google Apps Script هنا
const scriptURL = "https://script.google.com/macros/s/AKfycby6AGRlrrZxmF_3s9IcS6ZIZuAphEzUWMy0rdn6QzFshS_o59WzSdCW5jDJgolrw_Gl/exec";

form.addEventListener("submit", e => {
  e.preventDefault();

  successMsg.style.display = "none";
  errorMsg.style.display = "none";

  fetch(scriptURL, {
    method: "POST",
    body: new FormData(form)
  })
  .then(res => {
    successMsg.style.display = "block";
    form.reset();
  })
  .catch(err => {
    console.error(err);
    errorMsg.style.display = "block";
  });
});
