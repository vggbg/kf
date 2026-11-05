/*
 * Контактна форма - модал за вграждане.
 * Външният вид е съобразен с контактния модал на informiran-izbor.com.
 *
 * Вграждане (1 ред на всеки домейн):
 * <script src="https://tvoy-proekt.vercel.app/widget.js"
 *         data-button-text="Формуляр за контакт"></script>
 *
 * Атрибути (всички опционални):
 *   data-endpoint    - адрес на деплоя (по подразбиране: домейнът на самия script)
 *   data-button-text - текст на плаващия бутон
 *   data-color       - цвят (hex), по подразбиране #e67e22
 *   data-hide-button - "1" = без плаващ бутон; отваря се от елементи с data-cfw-open
 *
 * За връзка във футъра (както на informiran-izbor.com):
 *   <a href="#" data-cfw-open>За въпроси... ползвайте формулярът за контакт</a>
 *   <script src=".../widget.js" data-hide-button="1"></script>
 */
(function () {
  "use strict";
  if (window.__cfwLoaded) return;
  window.__cfwLoaded = true;

  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      return all[all.length - 1];
    })();

  var ENDPOINT = (script.getAttribute("data-endpoint") || "").replace(/\/+$/, "");
  if (!ENDPOINT) {
    var m = String(script.src).match(/^(https?:\/\/[^/]+)/);
    ENDPOINT = m ? m[1] : "";
  }
  var ORIGIN = "";
  try { ORIGIN = new URL(ENDPOINT).origin; } catch (e) { /* празно */ }

  var accent = script.getAttribute("data-color") || "";
  if (!/^#[0-9a-fA-F]{3,8}$/.test(accent)) accent = "#e67e22";
  var BUTTON_TEXT = script.getAttribute("data-button-text") || "Формуляр за контакт";
  var HIDE_BUTTON = script.getAttribute("data-hide-button") === "1";

  function pageUrl() {
    return ENDPOINT + "/?accent=" + encodeURIComponent(accent);
  }

  var css = [
    "@font-face{font-family:'Selawk';src:url('https://vggbg.com/fonts/selawk.woff2') format('woff2'),",
    "url('https://vggbg.com/fonts/selawk.woff') format('woff');font-weight:normal;font-style:normal;font-display:swap;}",
    ".cfw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);",
    "-webkit-backdrop-filter:blur(4px);display:none;justify-content:center;align-items:center;",
    "z-index:2147483000;padding:16px;}",
    ".cfw-overlay.cfw-open{display:flex;}",
    ".cfw-modal{background:#fff;width:100%;max-width:750px;border-radius:28px;padding:24px 24px 28px;",
    "box-shadow:0 30px 60px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;animation:cfwFade .25s;}",
    "@keyframes cfwFade{from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);}}",
    ".cfw-modal iframe{display:block;width:660px;max-width:100%;height:700px;border:none;",
    "border-radius:12px;background:#fff;margin:0 auto;}",
    ".cfw-title{font-family:'Arsenal','Selawk',sans-serif;font-size:1.4rem;font-weight:600;",
    "margin:0 0 20px;color:#1e2b37;display:flex;align-items:center;gap:10px;}",
    ".cfw-button{position:fixed;bottom:24px;right:24px;z-index:2147483001;display:flex;",
    "align-items:center;gap:6px;border:1px solid transparent;border-radius:40px;padding:14px 22px;",
    "background:" + accent + ";color:#fff;font:600 0.9rem 'Selawk',-apple-system,'Segoe UI',Roboto,sans-serif;",
    "box-shadow:0 6px 20px rgba(230,126,34,0.35);cursor:pointer;transition:.3s;white-space:nowrap;}",
    ".cfw-button:hover{transform:scale(1.05);box-shadow:0 8px 28px rgba(230,126,34,0.5);}",
    ".cfw-button:active{transform:scale(0.95);}",
    ".cfw-button svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;",
    "stroke-linecap:round;stroke-linejoin:round;}",
    "@media (max-width:640px){.cfw-overlay{padding:10px;}",
    ".cfw-modal{padding:18px 16px 20px;border-radius:20px;max-height:94vh;}",
    ".cfw-modal iframe{height:min(620px, calc(94vh - 44px));}}"
  ].join("");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // икони (Font Awesome) и шрифт за заглавието (Arsenal) - както на informiran-izbor.com
  var fa = document.createElement("link");
  fa.rel = "stylesheet";
  fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
  document.head.appendChild(fa);
  var arsenal = document.createElement("link");
  arsenal.rel = "stylesheet";
  arsenal.href = "https://fonts.googleapis.com/css2?family=Arsenal:wght@400;700&display=swap";
  document.head.appendChild(arsenal);

  var overlay = document.createElement("div");
  overlay.className = "cfw-overlay";

  var modal = document.createElement("div");
  modal.className = "cfw-modal";
  modal.innerHTML =
    '<h2 class="cfw-title"><i class="fas fa-envelope"></i> Формуляр за Контакт</h2>' +
    '<iframe title="Формуляр за Контакт"></iframe>';
  var frame = modal.querySelector("iframe");

  overlay.appendChild(modal);

  var btn = null;

  function open() {
    if (!frame.src || frame.src === "about:blank") {
      frame.src = pageUrl();
    }
    overlay.classList.add("cfw-open");
  }

  function close() {
    overlay.classList.remove("cfw-open");
    setTimeout(function () {
      if (!overlay.classList.contains("cfw-open")) {
        frame.src = "about:blank"; // ресетва формата за следващото отваряне
      }
    }, 250);
  }

  if (!HIDE_BUTTON) {
    btn = document.createElement("button");
    btn.className = "cfw-button";
    btn.type = "button";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/>' +
      '<path d="M3 7l9 6 9-6"/></svg><span></span>';
    btn.querySelector("span").textContent = BUTTON_TEXT;
    btn.addEventListener("click", open);
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  // всеки елемент с data-cfw-open отваря модала
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-cfw-open]") : null;
    if (t) {
      e.preventDefault();
      open();
    }
  });

  window.addEventListener("message", function (e) {
    if (!ORIGIN || e.origin !== ORIGIN) return;
    var d = e.data || {};
    if (d.type === "cfw:resize" && typeof d.height === "number") {
      var max = Math.max(320, window.innerHeight * 0.92 - 60);
      frame.style.height = Math.max(320, Math.min(d.height, max)) + "px";
    } else if (d.type === "cfw:close") {
      close();
    }
  });

  function mount() {
    document.body.appendChild(overlay);
    if (btn) document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
