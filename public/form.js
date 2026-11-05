(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var accent = params.get("accent");
  if (accent && /^#[0-9a-fA-F]{3,8}$/.test(accent)) {
    document.documentElement.style.setProperty("--accent", accent);
  }

  var form = document.getElementById("contact-form");
  var status = document.getElementById("status");
  var btn = document.getElementById("submit-btn");
  var success = document.getElementById("success");

  function inIframe() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }

  function postToParent(msg) {
    if (inIframe()) {
      try { window.parent.postMessage(msg, "*"); } catch (e) { /* нищо */ }
    }
  }

  function reportHeight() {
    var el = document.querySelector(".wrap");
    var h = el ? Math.ceil(el.getBoundingClientRect().height) : document.body.scrollHeight;
    postToParent({ type: "cfw:resize", height: h });
  }

  window.addEventListener("load", reportHeight);
  window.addEventListener("resize", reportHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reportHeight);
  }
  reportHeight();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = "";
    status.classList.remove("error");

    var data = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),
      message: document.getElementById("message").value.trim(),
      website: document.getElementById("website").value
    };

    if (!data.name || !data.email || !data.message) {
      status.textContent = "Моля, попълнете всички полета със * .";
      status.classList.add("error");
      reportHeight();
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Изпращане…';

    fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; })
          .then(function (body) { return { ok: r.ok, body: body }; });
      })
      .then(function (res) {
        if (res.ok && res.body.ok) {
          form.hidden = true;
          success.hidden = false;
          reportHeight();
          postToParent({ type: "cfw:success" });
        } else {
          status.textContent =
            (res.body && res.body.error) || "Възникна грешка. Опитайте отново.";
          status.classList.add("error");
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Изпрати';
          reportHeight();
        }
      })
      .catch(function () {
        status.textContent = "Няма връзка. Опитайте отново.";
        status.classList.add("error");
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Изпрати';
        reportHeight();
      });
  });

  document.getElementById("cancel-btn").addEventListener("click", function () {
    postToParent({ type: "cfw:close" });
  });
  document.getElementById("close-btn").addEventListener("click", function () {
    postToParent({ type: "cfw:close" });
  });
})();
