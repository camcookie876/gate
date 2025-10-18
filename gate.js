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
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Supabase error: ${res.status} ${txt}`)
  }
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
  if (document.getElementById("gate-styles")) return
  const style = document.createElement("style")
  style.id = "gate-styles"
  style.textContent = `
    @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
    @keyframes fadeOut { from {opacity:1;} to {opacity:0;} }
    .gate-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:#111;
      display:flex; justify-content:center; align-items:center; z-index:9999; animation:fadeIn 0.4s ease; }
    .gate-card { background:#fff; padding:20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.4);
      text-align:center; font-family:Arial,sans-serif; width:380px; }
    .gate-title { font-size:15px; margin-bottom:12px; font-weight:bold; color:#202124; }
    .gate-grid { display:grid; grid-template-columns:repeat(3, 100px); gap:6px; justify-content:center; }
    .gate-tile { position:relative; }
    .gate-img { width:100px; height:100px; border:2px solid #ccc; border-radius:4px; cursor:pointer;
      transition:transform 0.2s, border-color 0.2s; }
    .gate-img:hover { transform:scale(1.05); }
    .gate-img.selected { border-color:#4CAF50; }
    .gate-label { position:absolute; top:4px; left:6px; font-size:12px; background:rgba(0,0,0,0.5);
      color:#fff; padding:2px 4px; border-radius:2px; }
    .gate-btn { margin-top:14px; padding:8px 20px; background:#4285F4; color:#fff; border:none;
      border-radius:4px; cursor:pointer; font-size:14px; }
    .gate-btn:hover { background:#3367D6; }
    .gate-feedback { margin-top:10px; font-size:13px; min-height:18px; color:#333; }
  `
  document.head.appendChild(style)
}

function renderGate() {
  injectStyles()
  const overlay = document.createElement("div")
  overlay.className = "gate-overlay"
  const card = document.createElement("div")
  card.className = "gate-card"
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]
  const title = document.createElement("div")
  title.className = "gate-title"
  title.textContent = challenge.prompt
  card.appendChild(title)
  const grid = document.createElement("div")
  grid.className = "gate-grid"
  const selected = new Set()
  challenge.images.forEach((src, idx) => {
    const tile = document.createElement("div")
    tile.className = "gate-tile"
    const img = document.createElement("img")
    img.src = src
    img.className = "gate-img"
    const label = document.createElement("div")
    label.className = "gate-label"
    label.textContent = idx + 1
    img.addEventListener("click", () => {
      if (selected.has(idx)) {
        selected.delete(idx)
        img.classList.remove("selected")
      } else {
        selected.add(idx)
        img.classList.add("selected")
      }
    })
    tile.appendChild(img)
    tile.appendChild(label)
    grid.appendChild(tile)
  })
  card.appendChild(grid)
  const btn = document.createElement("button")
  btn.className = "gate-btn"
  btn.textContent = "Verify"
  card.appendChild(btn)
  const feedback = document.createElement("div")
  feedback.className = "gate-feedback"
  card.appendChild(feedback)
  btn.addEventListener("click", async () => {
    const indices = Array.from(selected).sort().join(",")
    const hash = await sha256(indices)
    if (hash === challenge.correctHash) {
      streak++
      feedback.textContent = `Correct. Streak ${streak}/${STREAK_REQUIRED}`
      if (streak >= STREAK_REQUIRED) {
        try { await issueToken() } catch { feedback.textContent = "Error issuing token." }
      } else {
        setTimeout(() => { overlay.remove(); renderGate() }, 600)
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
    overlay.style.animation = "fadeOut 0.6s ease forwards"
    setTimeout(() => overlay.remove(), 600)
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const valid = await validateToken()
    if (!valid) renderGate()
  } catch { renderGate() }
})