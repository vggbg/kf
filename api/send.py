"""
Vercel Serverless функция: получава съобщение от контактната форма
и го праща до твоята електронна поща чрез Resend API.

Endpoint: POST /api/send

Env променливи (Vercel -> Settings -> Environment Variables):
  RESEND_API_KEY    - API ключ от resend.com (задължително)
  CONTACT_EMAIL     - имейлът, на който да отиват съобщенията (задължително)
  MAIL_FROM         - подател, напр. "Форма <forma@tvoydomain.com>"
                      (по подразбиране onboarding@resend.dev - само за тест)
  ALLOWED_ORIGINS   - допълнителни домейни със запетая, които могат да викат
                      API-то директно (не е нужно за обикновеното вграждане)
  RATE_LIMIT_MAX    - макс. съобщения от един IP (по подразбиране 5)
  RATE_LIMIT_WINDOW - период в секунди (по подразбиране 600 = 10 минути)
"""

import html
import json
import os
import re
import time
from datetime import datetime

from flask import Flask, jsonify, request
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from zoneinfo import ZoneInfo
    _TZ = ZoneInfo("Europe/Sofia")
except Exception:
    _TZ = None

app = Flask(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_NAME_LEN = 100
MAX_MESSAGE_LEN = 3000

_rate = {}  # ip -> [времеви печати]


def _allowed_origin(origin: str) -> bool:
    """Същият домейн винаги минава; * в env отваря за всички."""
    if not origin:
        return True
    origin = origin.rstrip("/").lower()
    whitelist = [
        o.strip().lower()
        for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if o.strip()
    ]
    if "*" in whitelist:
        return True
    proto = request.headers.get("X-Forwarded-Proto", request.scheme or "https")
    host = (request.host or "").lower()
    return origin == f"{proto}://{host}" or origin in whitelist


def _cors(origin: str) -> dict:
    return {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _client_ip() -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    return xff.split(",")[0].strip() if xff else (request.remote_addr or "unknown")


def _rate_limited(ip: str) -> bool:
    limit = int(os.environ.get("RATE_LIMIT_MAX", "5"))
    window = int(os.environ.get("RATE_LIMIT_WINDOW", "600"))
    now = time.time()
    hits = [t for t in _rate.get(ip, []) if now - t < window]
    if len(hits) >= limit:
        _rate[ip] = hits
        return True
    hits.append(now)
    _rate[ip] = hits
    if len(_rate) > 5000:  # почистване на стари записи
        cutoff = now - window
        for k in list(_rate):
            _rate[k] = [t for t in _rate[k] if t > cutoff]
            if not _rate[k]:
                del _rate[k]
    return False


def _send_email(payload: dict) -> None:
    """Изпраща имейл през Resend. Отделна функция, за да се тества лесно."""
    key = os.environ.get("RESEND_API_KEY", "")
    req = Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=10) as resp:
        resp.read()


def _source_site() -> str:
    """От кой домейн е дошло съобщението (Origin / Referer)."""
    for h in (request.headers.get("Origin", ""), request.headers.get("Referer", "")):
        m = re.match(r"https?://([^/]+)", (h or "").strip())
        if m:
            return m.group(1)
    return request.host or "сайт"


def _build_html(name: str, phone: str, email: str, message: str, site: str) -> str:
    dt = datetime.now(_TZ) if _TZ else datetime.utcnow()
    rows = [
        ("Име", html.escape(name)),
        ("Електронна поща", html.escape(email)),
    ]
    if phone:
        rows.append(("Телефон", html.escape(phone)))
    rows += [
        ("Изпратено от", html.escape(site)),
        ("Дата", dt.strftime("%d.%m.%Y %H:%M")),
        ("Съобщение", html.escape(message).replace("\n", "<br>")),
    ]
    trs = "".join(
        f'<tr><td style="padding:6px 14px 6px 0;color:#64748b;white-space:nowrap;'
        f'vertical-align:top;">{k}</td>'
        f'<td style="padding:6px 0;color:#0f172a;">{v}</td></tr>'
        for k, v in rows
    )
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">'
        '<h2 style="margin:0 0 14px;font-size:16px;">Ново съобщение от контактната форма</h2>'
        f'<table style="border-collapse:collapse;">{trs}</table>'
        "</div>"
    )


@app.route("/api/send", methods=["POST", "OPTIONS"])
def send():
    origin = (request.headers.get("Origin", "") or "").strip().rstrip("/")

    def _json(obj: dict, status: int = 200):
        resp = jsonify(**obj)
        if origin:
            for k, v in _cors(origin).items():
                resp.headers[k] = v
        return resp, status

    if request.method == "OPTIONS":
        if origin and not _allowed_origin(origin):
            return "", 403, {}
        return "", 204, (_cors(origin) if origin else {})

    if origin and not _allowed_origin(origin):
        return _json({"ok": False, "error": "Заявката не е разрешена от този сайт."}, 403)

    if _rate_limited(_client_ip()):
        return _json(
            {"ok": False, "error": "Твърде много опити. Опитайте отново след няколко минути."},
            429,
        )

    if not os.environ.get("RESEND_API_KEY") or not os.environ.get("CONTACT_EMAIL"):
        return _json(
            {"ok": False, "error": "Сървърът не е конфигуриран (RESEND_API_KEY / CONTACT_EMAIL)."},
            500,
        )

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json({"ok": False, "error": "Невалидна заявка."}, 400)

    # Honeypot: бот е попълнил скритото поле -> притвори се, че е успех
    if (data.get("website") or "").strip():
        return _json({"ok": True})

    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    missing = []
    if not name or len(name) > MAX_NAME_LEN:
        missing.append("името")
    if not EMAIL_RE.match(email):
        missing.append("електронната поща")
    if len(phone) > 50:
        missing.append("телефонния номер")
    if not message or len(message) > MAX_MESSAGE_LEN:
        missing.append("съобщението")
    if missing:
        return _json({"ok": False, "error": "Проверете: " + ", ".join(missing) + "."}, 400)

    site = _source_site()
    payload = {
        "from": os.environ.get("MAIL_FROM", "Contact Form <onboarding@resend.dev>"),
        "to": [os.environ["CONTACT_EMAIL"]],
        "reply_to": email,
        "subject": f"[{site}] Ново съобщение от {name}",
        "html": _build_html(name, phone, email, message, site),
    }
    try:
        _send_email(payload)
    except HTTPError as e:
        print("Resend HTTP error:", e.code, e.read()[:500], flush=True)
        return _json({"ok": False, "error": "Имейлът не беше изпратен (грешка от доставчика)."}, 502)
    except (URLError, TimeoutError, OSError) as e:
        print("Resend network error:", e, flush=True)
        return _json({"ok": False, "error": "Имейлът не беше изпратен (мрежова грешка)."}, 502)

    return _json({"ok": True, "message": "Съобщението е изпратено."})
