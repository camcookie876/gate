// gate.js – Camcookie Gate with reCAPTCHA-style prompt

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase Setup ---
const SUPABASE_URL = "https://wewcufktohmyvfehdfsm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indld2N1Zmt0b2hteXZmZWhkZnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODM0NjQsImV4cCI6MjA3NTY1OTQ2NH0.Pngy8H3Q2GFo2yi3KTfcJwbWepVtTjjhba13tle4C_Q"; // replace with your anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Config ---
const STREAK_REQUIRED = 3;
const TOKEN_EXPIRY_HOURS = 24;
const COOKIE_NAME = "camcookie";

// --- Challenge Data ---
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
    correctHash: "d0b6094bba2355ea2b52825b058feb9c57886138310a58f9edabbde38a4f7898"
  }
  // Add more challenges with different prompts/images/hashes
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
  document.body.innerHTML = ""; // clear page

  const container = document.createElement("div");
  container.style.fontFamily = "sans-serif";
  container.style.textAlign = "center";
  container.style.marginTop = "40px";

  // Instruction prompt
  const instruction = document.createElement("h3");
  instruction.textContent = challenges[currentChallenge].prompt;
  instruction.style.marginBottom = "15px";
  container.appendChild(instruction);

  // Grid
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 100px)";
  grid.style.gap = "5px";
  grid.style.justifyContent = "center";
  grid.style.marginTop = "10px";

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

  container.appendChild(grid);

  // Submit button
  const button = document.createElement("button");
  button.textContent = "Verify";
  button.style.marginTop = "15px";
  button.style.padding = "8px 16px";
  button.style.background = "#007BFF";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.cursor = "pointer";
  container.appendChild(button);

  const feedback = document.createElement("p");
  feedback.style.marginTop = "10px";
  container.appendChild(feedback);

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

  document.body.appendChild(container);
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

function showProtectedContent() {
  document.body.innerHTML = "";
  const protectedDiv = document.createElement("div");
  protectedDiv.style.textAlign = "center";
  protectedDiv.style.marginTop = "50px";
  protectedDiv.innerHTML = `
    <h2>🎉 Protected Content</h2>
    <p>This is only visible after passing the Camcookie Gate.</p>
  `;
  document.body.appendChild(protectedDiv);
}

// --- Auto Init ---
document.addEventListener("DOMContentLoaded", async () => {
  const valid = await validateToken();
  if (valid) {
    showProtectedContent();
  } else {
    renderGate();
  }
});