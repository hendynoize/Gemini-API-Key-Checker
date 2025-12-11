/* =========================================================
   Global Variables (Untuk keperluan Export)
   ========================================================= */
let allResults = [];

/* =========================================================
   Utility Functions
   ========================================================= */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* =========================================================
   Core Logic: Check Single Key
   ========================================================= */
async function checkSingleKey(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;
  const payload = {
    contents: [{ parts: [{ text: "hi" }] }]
  };

  let attempt = 1;
  const maxAttempt = 3; // Dikurangi agar tidak terlalu lama menunggu

  while (attempt <= maxAttempt) {
    /* Delay manusiawi (anti-spam pattern) */
    if (attempt > 1) {
        // Exponential backoff untuk retry
        await sleep(attempt * 1000); 
    } else {
        await sleep(200 + Math.random() * 300);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      clearTimeout(timeout);

      // === STATUS 200: VALID ===
      if (res.status === 200) {
        return "VALID";
      }

      // === STATUS 429: RATE LIMIT / QUOTA ===
      if (res.status === 429) {
        // Jika sudah attempt terakhir, return LIMIT
        if (attempt === maxAttempt) return "LIMIT";
        console.warn(`Key ${key.substr(0,5)}... 429 detected, retrying...`);
        attempt++;
        continue; 
      }

      // === STATUS 400: INVALID KEY ===
      // Biasanya 400 Bad Request dengan pesan "API key not valid"
      if (res.status === 400) {
        return "INVALID";
      }

      // === STATUS 403: PERMISSION / QUOTA ===
      // Kadang 403 juga berarti quota habis (tergantung respons body), 
      // tapi untuk aman kita anggap Invalid/Permission denied kecuali pesannya jelas.
      if (res.status === 403) {
        return "INVALID";
      }

      // Status lain anggap Invalid sementara
      return "INVALID";

    } catch (err) {
      clearTimeout(timeout);
      // Jika network error/timeout, coba retry
      if (attempt === maxAttempt) return "ERROR"; // "ERROR" bisa dianggap Invalid di UI
      attempt++;
    }
  }

  return "INVALID";
}

/* =========================================================
   Main Function: Bulk Checker
   ========================================================= */
async function checkApiKeys() {
  const apiKeysInput = document.getElementById("apiKeys").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const tbody = document.getElementById("resultsList");
  const checkBtn = document.getElementById("checkBtn");
  const btnText = document.getElementById("btnText");
  const exportSection = document.getElementById("exportSection");

  // Reset UI
  errorBox.style.display = "none";
  tbody.innerHTML = "";
  allResults = []; // Reset data export
  exportSection.style.display = "none";

  if (!apiKeysInput) {
    errorBox.innerText = "Masukkan minimal 1 API Key!";
    errorBox.style.display = "block";
    return;
  }

  const keys = apiKeysInput.split("\n").map(k => k.trim()).filter(k => k);

  if (keys.length === 0) return;

  // UI State: Loading
  checkBtn.disabled = true;
  btnText.innerText = "Sedang Memeriksa...";
  document.getElementById("progressSection").style.display = "block";
  document.getElementById("summarySection").style.display = "block";
  document.getElementById("resultsSection").style.display = "block";

  let valid = 0, invalid = 0, limit = 0;
  document.getElementById("totalKeys").innerText = keys.length;

  // === LOOPING UTAMA ===
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    // Panggil fungsi pengecekan
    let status = await checkSingleKey(key);
    
    // Normalisasi status jika return "ERROR" network
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
    // Masking key agar tidak tampil penuh (opsional, hapus .substring jika ingin full)
    tdKey.textContent = key.substring(0, 10) + "****************"; 
    tdKey.title = key; // Tooltip show full key

    const tdStat = document.createElement("td");
    
    // Styling badge status
    let badgeClass = "status-invalid";
    if (status === "VALID") badgeClass = "status-valid";
    if (status === "LIMIT") badgeClass = "status-limit";
    
    tdStat.innerHTML = `<span class="result-status ${badgeClass}">${status}</span>`;

    tr.appendChild(tdKey);
    tr.appendChild(tdStat);
    tbody.appendChild(tr);
  }

  // UI State: Selesai
  checkBtn.disabled = false;
  btnText.innerText = "Mulai Pengecekan";
  exportSection.style.display = "block"; // Munculkan tombol export
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
