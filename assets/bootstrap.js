let allResults = [];

/* =========================================================
   Utility Functions
   ========================================================= */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* =========================================================
   Core Logic: Check Single Key (perbaikan)
   ========================================================= */
async function checkSingleKey(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`;
  const payload = {
    contents: [{ parts: [{ text: "ping" }] }]
  };

  let attempt = 1;
  const maxAttempt = 3;

  while (attempt <= maxAttempt) {
    // Delay sederhana
    if (attempt > 1) await sleep(attempt * 1000);
    else await sleep(200 + Math.random() * 300);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // NOTE: hanya satu field headers (duplicated headers removed)
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) SafeCheck/1.0"
        },
        body: JSON.stringify(payload)
      });

      clearTimeout(timeoutId);

      console.log(`checkSingleKey: ${key} => HTTP ${res.status}`);

      if (res.status === 200) return "VALID";
      if (res.status === 429) {
        if (attempt === maxAttempt) return "LIMIT";
        attempt++;
        continue;
      }
      if (res.status === 400) return "INVALID";
      if (res.status === 403) return "INVALID";

      // fallback: coba baca body untuk diagnosa (opsional)
      try {
        const text = await res.text();
        console.log("Response body:", text.slice(0, 200));
      } catch (e) {}

      return "INVALID";
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`checkSingleKey error for ${key} (attempt ${attempt}):`, err && err.name ? err.name : err);
      if (attempt === maxAttempt) return "ERROR";
      attempt++;
    }
  }

  return "INVALID";
}

/* =========================================================
   Main Function: Bulk Checker (perbaikan)
   ========================================================= */
async function checkApiKeys() {
  const apiKeysInput = document.getElementById("apiKeys").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const tbody = document.getElementById("resultsList");
  const checkBtn = document.getElementById("checkBtn");
  const btnText = document.getElementById("btnText");
  const exportSection = document.getElementById("exportSection");
  const summaryList = document.getElementById("summaryList");

  // Reset UI
  errorBox.style.display = "none";
  tbody.innerHTML = "";
  summaryList.innerHTML = "";
  allResults = [];
  exportSection.style.display = "none";

  if (!apiKeysInput) {
    errorBox.innerText = "Masukkan minimal 1 API Key!";
    errorBox.style.display = "block";
    return;
  }

  const keys = apiKeysInput.split("\n").map(k => k.trim()).filter(k => k);
  if (keys.length === 0) {
    errorBox.innerText = "Tidak ada key yang valid pada input.";
    errorBox.style.display = "block";
    return;
  }

  // UI State: Loading
  checkBtn.disabled = true;
  btnText.innerText = "Sedang Memeriksa...";
  document.getElementById("progressSection").style.display = "block";
  document.getElementById("summarySection").style.display = "block";
  // pastikan resultsSection terlihat (ambil by id pertama)
  const resultsSection = document.querySelector("#resultsSection");
  if (resultsSection) resultsSection.style.display = "block";

  let valid = 0, invalid = 0, limit = 0;
  document.getElementById("totalKeys").innerText = keys.length;

  console.log("Starting check for", keys.length, "keys");

  // === LOOPING UTAMA ===
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // Panggil fungsi pengecekan
    let status = await checkSingleKey(key);

    if (status === "ERROR") status = "INVALID";

    // Simpan ke array global untuk export
    allResults.push({ key: key, status: status });

    // Update Counter
    if (status === "VALID") valid++;
    else if (status === "LIMIT") limit++;
    else invalid++;

    document.getElementById("validKeys").innerText = valid;
    document.getElementById("invalidKeys").innerText = invalid;
    document.getElementById("limitKeys").innerText = limit;

    // Update Progress Bar
    const progress = ((i + 1) / keys.length) * 100;
    document.getElementById("progressFill").style.width = progress + "%";
    document.getElementById("progressText").innerText = `Memeriksa: ${i + 1} dari ${keys.length}`;

    // Update Tabel DOM
    const tr = document.createElement("tr");

    const tdKey = document.createElement("td");
    tdKey.style.fontFamily = "monospace";
    tdKey.textContent = key.length > 20 ? key.substring(0, 10) + "****************" : key;
    tdKey.title = key;

    const tdStat = document.createElement("td");

    let badgeClass = "status-invalid";
    if (status === "VALID") badgeClass = "status-valid";
    if (status === "LIMIT") badgeClass = "status-limit";

    tdStat.innerHTML = `<span class="result-status ${badgeClass}">${status}</span>`;

    tr.appendChild(tdKey);
    tr.appendChild(tdStat);
    tbody.appendChild(tr);

    // === UPDATE SUMMARY LIST (DALAM LOOP) ===
    let cls = "sum-invalid";
    if (status === "VALID") cls = "sum-valid";
    if (status === "LIMIT") cls = "sum-limit";

    summaryList.innerHTML += `
      <div>${key} : <span class="${cls}">${status}</span></div>
    `;
  } // end for

  // === UI State: Selesai (DI LUAR LOOP) ===
  checkBtn.disabled = false;
  btnText.innerText = "Mulai Pengecekan";
  exportSection.style.display = "block";
  console.log("Pengecekan selesai, hasil:", allResults);
  alert("Pengecekan Selesai!");
}

/* =========================================================
   Export Functions
   ========================================================= */
function exportToTxt() {
  if (allResults.length === 0) return alert("Tidak ada data untuk diekspor!");

  let content = "=== HASIL CHECKER API GEMINI ===\n\n";
  allResults.forEach(item => {
    content += `${item.key} | ${item.status}\n`;
  });

  downloadFile("gemini_checked.txt", content, "text/plain");
}

function exportToJson() {
  if (allResults.length === 0) return alert("Tidak ada data untuk diekspor!");
  
  const content = JSON.stringify(allResults, null, 2);
  downloadFile("gemini_checked.json", content, "application/json");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

/* =========================================================
   Inject Gambar Iklan
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const ads = document.querySelector(".ads-box");
    if (ads) {
        ads.innerHTML = "";

        // Gambar
        const img = document.createElement("img");
        img.src = "https://gkey.pages.dev/assets/saweria.png";
        img.alt = "Support Developer";
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";
        img.style.display = "block"; // pastikan block

        // Credit
        const credit = document.createElement("div");
        credit.innerHTML = `<center><small>Code by <a href="https://hendynoize.net" target="_blank">hendynoize.net</a></small></center>`;
        credit.style.display = "block";   // paksa block
        credit.style.width = "100%";      // ambil 1 baris penuh
        credit.style.marginTop = "6px";

        // Append
        ads.appendChild(img);
        ads.appendChild(credit);
    }
});
