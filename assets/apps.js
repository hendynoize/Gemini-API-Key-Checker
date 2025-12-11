/* =========================================================
   Human Behavior + Anti-Spam + Backoff
   ========================================================= */

async function checkSingleKey(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;
  const payload = {
    contents: [{ parts: [{ text: "hi" }] }]
  };

  let attempt = 1;
  const maxAttempt = 5;

  while (attempt <= maxAttempt) {

    /* Delay manusiawi sebelum request */
    await sleep(200 + Math.random() * 500);  // 200–700ms

    if (Math.random() < 0.25) {
      await sleep(60 + Math.random() * 120); // micro-lag
    }

    /* Timeout protector */
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      clearTimeout(timeout);

      if (res.status === 200) return "VALID";

      if (res.status === 429 || res.status === 403) {
        const wait = attempt * 1200 + Math.random() * 800;
        console.warn(`429/403 — cooldown ${wait.toFixed(0)} ms`);
        await sleep(wait);
        attempt++;
        continue;
      }

      return "INVALID";

    } catch (err) {
      clearTimeout(timeout);

      const wait = attempt * 1500 + Math.random() * 700;
      console.warn(`Timeout/error — retry ${wait.toFixed(0)} ms`);
      await sleep(wait);
      attempt++;
    }
  }

  return "INVALID";
}

/* =========================================================
   Bulk Checker — Tabel Tetap Dipertahankan
   ========================================================= */

async function checkApiKeys() {
  const apiKeysInput = document.getElementById("apiKeys").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const tbody = document.getElementById("resultsList");

  errorBox.style.display = "none";
  tbody.innerHTML = "";

  if (!apiKeysInput) {
    errorBox.innerText = "Masukkan minimal 1 API Key!";
    errorBox.style.display = "block";
    return;
  }

  const keys = apiKeysInput.split("\n").map(k => k.trim()).filter(k => k);

  document.getElementById("progressSection").style.display = "block";
  document.getElementById("summarySection").style.display = "block";
  document.getElementById("resultsSection").style.display = "block";

  let valid = 0, invalid = 0, limit = 0;
  document.getElementById("totalKeys").innerText = keys.length;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const status = await checkSingleKey(key);

    if (status === "VALID") valid++;
    else if (status === "LIMIT") limit++;
    else invalid++;

    document.getElementById("validKeys").innerText = valid;
    document.getElementById("invalidKeys").innerText = invalid;
    document.getElementById("limitKeys").innerText = limit;

    const progress = ((i + 1) / keys.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
    document.getElementById("progressText").innerText = `Memeriksa: ${i + 1} dari ${keys.length}`;

    /* ==== TETAP TABLE ==== */
    const tr = document.createElement("tr");

    const tdKey = document.createElement("td");
    tdKey.className = "mono";
    tdKey.textContent = key;

    const tdStat = document.createElement("td");
    tdStat.className = "status-" + status.toLowerCase();
    tdStat.textContent = status;

    tr.appendChild(tdKey);
    tr.appendChild(tdStat);
    tbody.appendChild(tr);

    /* Delay manusia (anti-spam) */
    await sleep(300 + Math.random() * 900); // 300–1200ms
  }
}

/* =========================================================
   Utility
   ========================================================= */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* =========================================================
   Inject Gambar Iklan (TETAP ADA)
   ========================================================= */

const ads = document.querySelector(".ads-box");
ads.innerHTML = "";

const img = document.createElement("img");
img.src = "https://gkey.pages.dev/assets/saweria.png";
img.alt = "Ads";
img.style.maxWidth = "100%";
img.style.borderRadius = "8px";
img.style.display = "block";

ads.appendChild(img);
