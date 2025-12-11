/* apps.js — Bulk API Key Checker (fixed, anti-rate-limit) */

/**
 * Menggunakan:
 * - checkApiKeys() dipanggil oleh button "Check"
 * - Membutuhkan elemen HTML dengan id:
 *   apiKeys, errorMessage, resultsList,
 *   progressSection, summarySection, resultsSection,
 *   totalKeys, validKeys, invalidKeys, limitKeys,
 *   progressFill, progressText
 */

async function checkApiKeys() {
    const apiKeysInput = document.getElementById("apiKeys")?.value.trim();
    const errorMessage = document.getElementById("errorMessage");
    const resultsList = document.getElementById("resultsList");

    if (!errorMessage || !resultsList) {
        console.error("Missing required DOM nodes (errorMessage/resultsList).");
        return;
    }

    errorMessage.style.display = "none";
    resultsList.innerHTML = "";

    if (!apiKeysInput) {
        errorMessage.innerText = "Masukkan minimal 1 API Key!";
        errorMessage.style.display = "block";
        return;
    }

    const keys = apiKeysInput.split("\n")
        .map(k => k.trim())
        .filter(k => k !== "");

    // Tampilkan UI progres (safeguard jika elemen ada)
    document.getElementById("progressSection")?.style.display = "block";
    document.getElementById("summarySection")?.style.display = "block";
    document.getElementById("resultsSection")?.style.display = "block";

    let valid = 0, invalid = 0, limit = 0;

    document.getElementById("totalKeys") && (document.getElementById("totalKeys").innerText = keys.length);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        // Periksa key — fungsi handle retry/backoff
        const status = await checkSingleKey(key);

        if (status === "VALID") valid++;
        else if (status === "LIMIT") limit++;
        else invalid++;

        // Update summary UI (safeguard)
        if (document.getElementById("validKeys")) document.getElementById("validKeys").innerText = valid;
        if (document.getElementById("invalidKeys")) document.getElementById("invalidKeys").innerText = invalid;
        if (document.getElementById("limitKeys")) document.getElementById("limitKeys").innerText = limit;

        // progress bar
        const progress = ((i + 1) / keys.length) * 100;
        if (document.getElementById("progressFill")) document.getElementById("progressFill").style.width = progress + "%";
        if (document.getElementById("progressText")) {
            document.getElementById("progressText").innerText = `Memeriksa: ${i + 1} dari ${keys.length}`;
        }

        // tampilkan hasil
        addResultToUI(key, status);

        // === Anti spam random delay 300–1200ms ===
        await sleep(300 + Math.floor(Math.random() * 900));
    }
}

/**
 * checkSingleKey
 * - Mengirim fetch POST
 * - Timeout via AbortController (8s)
 * - Retry max 5 kali dengan backoff (exponential-ish)
 * - Mengembalikan: "VALID", "LIMIT", "INVALID"
 *
 * NOTE: Browsers tidak mengizinkan custom User-Agent header, jadi kita tidak mengirimnya.
 */
async function checkSingleKey(key) {
    const urlBase = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
    const maxAttempt = 5;
    let attempt = 1;

    while (attempt <= maxAttempt) {
        const controller = new AbortController();
        const timeoutMs = 8000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const resp = await fetch(urlBase + "?key=" + encodeURIComponent(key), {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json"
                    // jangan set User-Agent di browser
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "ping" }] }]
                })
            });

            clearTimeout(timeoutId);

            // langsung tangani status code
            if (resp.status === 200) {
                // optional: bisa cek body untuk kesalahan tersembunyi
                return "VALID";
            }

            if (resp.status === 429) {
                // rate limit — gunakan backoff dan coba lagi
                const wait = attempt * 1500 + Math.floor(Math.random() * 500);
                console.warn(`Key ${maskKey(key)} => 429. Cooling down ${wait}ms (attempt ${attempt})`);
                await sleep(wait);
                attempt++;
                continue;
            }

            if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
                // invalid / permission issues
                // optional: baca body.message untuk detail
                return "INVALID";
            }

            // untuk kode lain, baca body apakah ada "error"
            let bodyText = "";
            try { bodyText = await resp.text(); } catch (e) { bodyText = ""; }

            if (bodyText && bodyText.includes('"error"')) {
                // jika error kemungkinan invalid/usage limit, tapi kita sudah tangani 429 di atas
                // simple fallback → invalid
                return "INVALID";
            }

            // default fallback
            return "INVALID";

        } catch (err) {
            clearTimeout(timeoutId);

            // Jika abort => timeout
            if (err.name === "AbortError") {
                const wait = attempt * 2000;
                console.warn(`Key ${maskKey(key)} => timeout. Retry in ${wait}ms (attempt ${attempt})`);
                await sleep(wait);
                attempt++;
                continue;
            }

            // network error lain — retry juga tapi dengan backoff
            const wait = attempt * 2000;
            console.warn(`Key ${maskKey(key)} => network error (${err.message}). Retry in ${wait}ms (attempt ${attempt})`);
            await sleep(wait);
            attempt++;
            continue;
        }
    }

    // jika sudah melewati retry, anggap invalid
    return "INVALID";
}

/** Tambah result ke UI */
function addResultToUI(key, status) {
    const list = document.getElementById("resultsList");
    if (!list) return;

    const div = document.createElement("div");
    div.classList.add("result-item");

    if (status === "VALID") div.classList.add("valid");
    else if (status === "LIMIT") div.classList.add("limit");
    else div.classList.add("invalid");

    // tampilkan key dengan sebagian disamarkan supaya aman di layar
    const masked = maskKey(key);

    div.innerHTML = `
        <span class="result-key">${escapeHtml(masked)}</span>
        <span class="result-status status-${status.toLowerCase()}">${status}</span>
    `;

    list.appendChild(div);
    // scroll ke bawah tiap penambahan (opsional)
    list.scrollTop = list.scrollHeight;
}

/** Inject ad image (tetap sama) */
function injectAdImage(imgUrl) {
    const adsBox = document.querySelector(".ads-box");
    if (!adsBox) return;

    adsBox.innerHTML = ""; // clear existing content

    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "Advertisement";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.display = "block";

    adsBox.appendChild(img);
}

/** Utility: sleep */
function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

/** Utility: mask key untuk tampilan (tampilkan 6 char awal + ... ) */
function maskKey(key) {
    if (!key) return "";
    const k = key.trim();
    if (k.length <= 12) return k.replace(/.(?=.{4})/g, "*");
    return k.slice(0, 8) + "..." + k.slice(-4);
}

/** Utility: escape HTML to prevent injection */
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/** Inisialisasi ad image (bila ada) */
injectAdImage("https://gkey.pages.dev/assets/saweria.png");

/* Optional: expose function to window so button onclick="checkApiKeys()" works */
window.checkApiKeys = checkApiKeys;
