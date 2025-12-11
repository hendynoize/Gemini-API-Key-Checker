async function checkApiKeys() {
    const apiKeysInput = document.getElementById("apiKeys").value.trim();
    const errorMessage = document.getElementById("errorMessage");
    const resultsList = document.getElementById("resultsList");

    errorMessage.style.display = "none";
    resultsList.innerHTML = "";

    if (!apiKeysInput) {
        errorMessage.innerText = "Masukkan minimal 1 API Key!";
        errorMessage.style.display = "block";
        return;
    }

    const keys = apiKeysInput.split("\n").map(k => k.trim()).filter(k => k !== "");

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
        document.getElementById("progressText").innerText =
            `Memeriksa: ${i + 1} dari ${keys.length}`;

        addResultToUI(key, status);

        // === Anti spam random delay 300–1200ms ===
        await new Promise(r => setTimeout(r, 300 + Math.random() * 900));
    }
}


    div.innerHTML = `
        <span class="result-key">${key}</span>
        <span class="result-status status-${status.toLowerCase()}">${status}</span>
    `;

    list.appendChild(div);
}
function injectAdImage(imgUrl) {
    const adsBox = document.querySelector(".ads-box");

    adsBox.innerHTML = ""; // clear existing content

    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "Advertisement";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.display = "block";

    adsBox.appendChild(img);
}

injectAdImage("https://gkey.pages.dev/assets/saweria.png");
