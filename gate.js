const SUPABASE_URL = "https://wewcufktohmyvfehdfsm.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indld2N1Zmt0b2hteXZmZWhkZnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODM0NjQsImV4cCI6MjA3NTY1OTQ2NH0.Pngy8H3Q2GFo2yi3KTfcJwbWepVtTjjhba13tle4C_Q"
const SUPABASE_TABLE = "camcookie_tokens"
const STREAK_REQUIRED = 2
const TOKEN_EXPIRY_HOURS = 24
const COOKIE_NAME = "camcookie"

const challenges = [
  {
    prompt: "Select all images with street lights",
    images: [
      "https://camcookie876.github.io/gate/images/1/img1.png",
      "https://camcookie876.github.io/gate/images/1/img2.png",
      "https://camcookie876.github.io/gate/images/1/img3.png",
      "https://camcookie876.github.io/gate/images/1/img4.png",
      "https://camcookie876.github.io/gate/images/1/img5.png",
      "https://camcookie876.github.io/gate/images/1/img6.png",
      "https://camcookie876.github.io/gate/images/1/img7.png",
      "https://camcookie876.github.io/gate/images/1/img8.png",
      "https://camcookie876.github.io/gate/images/1/img9.png"
    ],
    correctHash: "8871664c43ff1ea48a137ceafb7d02c6c983bdc3b0899cb430972e597b2f441c"
  }
]

async function sbFetch(path, { method = "GET", body, headers = {} } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function sha256(str) {
  const buf = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
}

function setCookie(name, value, hours) {
  const d = new Date()
  d.setTime(d.getTime() + hours * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;Secure;SameSite=Strict`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? match[2] : null
}

async function issueToken() {
  const rawToken = crypto.randomUUID()
  const tokenHash = await sha256(rawToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  await sbFetch(`${SUPABASE_TABLE}`, {
    method: "POST",
    body: [{ token_hash: tokenHash, created_at: now.toISOString(), expires_at: expiresAt }],
    headers: { Prefer: "return=minimal" }
  })
  setCookie(COOKIE_NAME, rawToken, TOKEN_EXPIRY_HOURS)
  closeOverlay()
}

async function validateToken() {
  const rawToken = getCookie(COOKIE_NAME)
  if (!rawToken) return false
  const tokenHash = await sha256(rawToken)
  const rows = await sbFetch(`${SUPABASE_TABLE}?token_hash=eq.${tokenHash}&select=expires_at&limit=1`)
  if (!rows?.length) return false
  return new Date(rows[0].expires_at) > new Date()
}

let streak = 0

function injectStyles() {
  if (document.getElementById("camcookie-gate-styles")) return
  const style = document.createElement("style")
  style.id = "camcookie-gate-styles"
  style.textContent = `
    @keyframes gateFadeIn { from {opacity:0; transform:scale(0.98);} to {opacity:1; transform:scale(1);} }
    @keyframes gateFadeOut { from {opacity:1;} to {opacity:0;} }
    @keyframes sweepGlow { 0% {box-shadow:0 0 0 rgba(0,0,0,0);} 50% {box-shadow:0 0 40px rgba(66,133,244,0.6);} 100% {box-shadow:0 0 0 rgba(0,0,0,0);} }
    .gate-overlay {
      position:fixed; inset:0; z-index:2147483647;
      background:linear-gradient(135deg, #0c0f14 0%, #12151e 100%);
      backdrop-filter: blur(2px);
      display:flex; align-items:center; justify-content:center;
    }
    .gate-card {
      width:420px; max-width:90vw;
      background:#0f1320;
      border:3px solid #3a7afe;
      border-radius:14px;
      box-shadow:0 30px 70px rgba(58,122,254,0.35), inset 0 0 20px rgba(58,122,254,0.25);
      color:#e8eefc;
      font-family:Inter, Arial, sans-serif;
      padding:22px 22px 18px;
      animation:gateFadeIn 280ms ease, sweepGlow 2.2s ease infinite;
    }
    .gate-header {
      display:flex; align-items:center; justify-content:flex-start; gap:10px; margin-bottom:12px;
    }
    .gate-title {
      font-size:16px; font-weight:800; letter-spacing:0.2px; color:#cfe2ff;
      text-shadow:0 0 8px rgba(58,122,254,0.45);
    }
    .gate-svg {
      width:28px; height:28px; flex:0 0 28px;
      filter: drop-shadow(0 0 6px rgba(58,122,254,0.5));
    }
    .gate-grid {
      display:grid; grid-template-columns:repeat(3, 110px); gap:10px; justify-content:center; margin-top:8px;
    }
    .gate-tile {
      position:relative; width:110px; height:110px; border-radius:8px; overflow:hidden;
      border:2px solid #2b3a67; background:#0b1020;
      transition:border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      box-shadow:0 10px 25px rgba(0,0,0,0.35);
    }
    .gate-tile:hover { transform:translateY(-2px) scale(1.03); box-shadow:0 18px 38px rgba(0,0,0,0.5); }
    .gate-img { width:100%; height:100%; object-fit:cover; display:block; }
    .gate-label {
      position:absolute; top:6px; left:8px;
      font-size:12px; font-weight:700; color:#e8eefc;
      background:linear-gradient(180deg, rgba(16,22,38,0.85), rgba(16,22,38,0.55));
      border:1px solid #334a87; border-radius:4px; padding:2px 6px;
      box-shadow:0 0 6px rgba(58,122,254,0.4);
    }
    .gate-selected { border-color:#4bd6ff; box-shadow:0 0 0 2px rgba(75,214,255,0.4), 0 12px 30px rgba(75,214,255,0.25); }
    .gate-actions { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
    .gate-verify {
      appearance:none; border:none; border-radius:10px;
      background:linear-gradient(180deg, #3a7afe 0%, #2e6ae0 100%);
      color:#fff; font-weight:800; letter-spacing:0.3px;
      padding:10px 18px; cursor:pointer; font-size:14px;
      box-shadow:0 12px 30px rgba(58,122,254,0.45), inset 0 -2px 0 rgba(0,0,0,0.25);
      transition:transform 140ms ease, box-shadow 140ms ease;
    }
    .gate-verify:hover { transform:translateY(-1px); box-shadow:0 14px 34px rgba(58,122,254,0.55), inset 0 -2px 0 rgba(0,0,0,0.25); }
    .gate-verify:active { transform:translateY(0); box-shadow:0 10px 26px rgba(58,122,254,0.45); }
    .gate-feedback { font-size:13px; font-weight:700; color:#9cc4ff; text-shadow:0 0 6px rgba(58,122,254,0.35); }
    .gate-badge { display:flex; align-items:center; gap:8px; color:#8aa9e6; font-size:11px; }
    .gate-hidden { animation:gateFadeOut 420ms ease forwards; }
  `
  document.head.appendChild(style)
}

function makeIconSVG(type = "shield") {
  if (type === "shield") {
    const svg = `
      <svg class="gate-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#3a7afe" offset="0"/>
            <stop stop-color="#4bd6ff" offset="1"/>
          </linearGradient>
        </defs>
        <path d="M12 2l7 3v6c0 5.25-3.44 8.9-7 11-3.56-2.1-7-5.75-7-11V5l7-3z" fill="url(#g1)" stroke="#2e6ae0" stroke-width="1.2"/>
        <path d="M9 12l2 2 4-4" fill="none" stroke="#e8eefc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    const span = document.createElement("span")
    span.innerHTML = svg
    return span.firstChild
  }
  const svg = `
    <svg class="gate-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="10" width="20" height="12" rx="3" fill="#3a7afe" opacity="0.3"/>
      <circle cx="16" cy="16" r="5" fill="#4bd6ff"/>
      <rect x="10" y="8" width="12" height="3" rx="1.5" fill="#2e6ae0"/>
    </svg>`
  const span = document.createElement("span")
  span.innerHTML = svg
  return span.firstChild
}

function renderOverlay() {
  injectStyles()
  const overlay = document.createElement("div")
  overlay.className = "gate-overlay"

  const card = document.createElement("div")
  card.className = "gate-card"

  const header = document.createElement("div")
  header.className = "gate-header"
  header.appendChild(makeIconSVG("shield"))
  const title = document.createElement("div")
  title.className = "gate-title"
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]
  title.textContent = challenge.prompt
  header.appendChild(title)
  card.appendChild(header)

  const grid = document.createElement("div")
  grid.className = "gate-grid"
  const selected = new Set()

  challenge.images.forEach((src, idx) => {
    const tile = document.createElement("div")
    tile.className = "gate-tile"
    const img = document.createElement("img")
    img.src = src
    img.className = "gate-img"
    img.alt = `Tile ${idx + 1}`
    const label = document.createElement("div")
    label.className = "gate-label"
    label.textContent = idx + 1
    img.addEventListener("click", () => {
      if (selected.has(idx)) {
        selected.delete(idx)
        tile.classList.remove("gate-selected")
      } else {
        selected.add(idx)
        tile.classList.add("gate-selected")
      }
    })
    tile.appendChild(img)
    tile.appendChild(label)
    grid.appendChild(tile)
  })
  card.appendChild(grid)

  const actions = document.createElement("div")
  actions.className = "gate-actions"
  const badge = document.createElement("div")
  badge.className = "gate-badge"
  badge.appendChild(makeIconSVG("chip"))
  badge.appendChild(document.createTextNode("Protected by Camcookie Gate"))
  const verify = document.createElement("button")
  verify.className = "gate-verify"
  verify.textContent = "Verify"
  actions.appendChild(badge)
  actions.appendChild(verify)
  card.appendChild(actions)

  const feedback = document.createElement("div")
  feedback.className = "gate-feedback"
  card.appendChild(feedback)

  verify.addEventListener("click", async () => {
    const indices = Array.from(selected).sort().join(",")
    const hash = await sha256(indices)
    if (hash === challenge.correctHash) {
      streak++
      feedback.textContent = `Correct (${streak}/${STREAK_REQUIRED})`
      if (streak >= STREAK_REQUIRED) {
        try { await issueToken() } catch { feedback.textContent = "Error issuing token." }
      } else {
        overlay.classList.add("gate-hidden")
        setTimeout(() => { overlay.remove(); renderOverlay() }, 400)
      }
    } else {
      streak = 0
      feedback.textContent = "Incorrect. Try again."
    }
  })

  overlay.appendChild(card)
  document.body.appendChild(overlay)
}

function closeOverlay() {
  const overlay = document.querySelector(".gate-overlay")
  if (overlay) {
    overlay.classList.add("gate-hidden")
    setTimeout(() => overlay.remove(), 420)
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const valid = await validateToken()
    if (!valid) renderOverlay()
  } catch {
    renderOverlay()
  }
})