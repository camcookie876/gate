// camcookie-gate.js
// Camcookie Gate Project – Full JS Implementation

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wewcufktohmyvfehdfsm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indld2N1Zmt0b2hteXZmZWhkZnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODM0NjQsImV4cCI6MjA3NTY1OTQ2NH0.Pngy8H3Q2GFo2yi3KTfcJwbWepVtTjjhba13tle4C_Q"; // anon key with RLS enabled
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Config ---
const STREAK_REQUIRED = 3;
const TOKEN_EXPIRY_HOURS = 24;
const COOKIE_NAME = "camcookie";

// Example challenge data (replace with your own images + hashed answers)
const challenges = [
  {
    images: [
      "img1.png","img2.png","img3.png",
      "img4.png","img5.png","img6.png",
      "img7.png","img8.png","img9.png"
    ],
    correctHash: "SHA256_HASH_OF_CORRECT_INDICES"
  }
  // Add more challenges here
];

// --- Utility Functions ---
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function setCookie(name, value, hours) {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;Secure;SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

// --- Gate Logic ---
let streak = 0;
let currentChallenge = 0;

async function renderGate() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const logo = document.createElement("img");
  logo.src = "https://your-logo-url.png";
  logo.style.maxWidth = "150px";
  app.appendChild(logo);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 100px)";
  grid.style.gap = "5px";

  const selected = new Set();

  challenges[currentChallenge].images.forEach((src, idx) => {
    const img = document.createElement("img");
    img.src = src;
    img.style.width = "100px";
    img.style.height = "100px";
    img.style.border = "2px solid #007BFF";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => {
      if (selected.has(idx)) {
        selected.delete(idx);
        img.style.border = "2px solid #007BFF";
      } else {
        selected.add(idx);
        img.style.border = "2px solid #00FF00";
      }
    });
    grid.appendChild(img);
  });

  app.appendChild(grid);

  const button = document.createElement("button");
  button.textContent = "Submit";
  button.style.marginTop = "10px";
  button.style.padding = "8px 16px";
  button.style.background = "#007BFF";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.cursor = "pointer";
  app.appendChild(button);

  const feedback = document.createElement("p");
  feedback.style.marginTop = "10px";
  app.appendChild(feedback);

  button.addEventListener("click", async () => {
    const indices = Array.from(selected).sort().join(",");
    const hash = await sha256(indices);

    if (hash === challenges[currentChallenge].correctHash) {
      streak++;
      feedback.textContent = `Correct! Streak: ${streak}/${STREAK_REQUIRED}`;
      if (streak >= STREAK_REQUIRED) {
        await issueToken();
      } else {
        currentChallenge = (currentChallenge + 1) % challenges.length;
        setTimeout(renderGate, 1000);
      }
    } else {
      streak = 0;
      feedback.textContent = "Incorrect. Try again.";
    }
  });
}

async function issueToken() {
  const rawToken = crypto.randomUUID();
  const tokenHash = await sha256(rawToken);

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from("camcookie_tokens").insert([
    { token_hash: tokenHash, created_at: new Date().toISOString(), expires_at: expiresAt }
  ]);

  setCookie(COOKIE_NAME, rawToken, TOKEN_EXPIRY_HOURS);

  showProtectedContent();
}

async function validateToken() {
  const rawToken = getCookie(COOKIE_NAME);
  if (!rawToken) return false;

  const tokenHash = await sha256(rawToken);
  const { data, error } = await supabase
    .from("camcookie_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return false;

  const now = new Date();
  return new Date(data.expires_at) > now;
}

async function showProtectedContent() {
  document.getElementById("app").style.display = "none";
  const protectedApp = document.getElementById("protected-app");
  protectedApp.style.display = "block";
}

// --- Init ---
(async function init() {
  const valid = await validateToken();
  if (valid) {
    showProtectedContent();
  } else {
    renderGate();
  }
})();