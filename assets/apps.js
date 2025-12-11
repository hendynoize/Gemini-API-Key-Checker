async function checkSingleKey(key){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;
  const payload = {
    contents:[{parts:[{text:"hi"}]}]
  };
  try {
    const res = await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if(res.status === 200) return "VALID";
    if(res.status === 429 || res.status === 403) return "LIMIT";
    return "INVALID";
  }catch(e){
    return "INVALID";
  }
}

/* ---------- UI & LOGIKA LENGKAP ---------- */
async function checkApiKeys(){
  const apiKeysInput = document.getElementById("apiKeys").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const resultsList = document.getElementById("resultsList");

  errorBox.style.display = "none";
  resultsList.innerHTML = "";

  if(!apiKeysInput){
    errorBox.innerText = "Masukkan minimal 1 API Key!";
    errorBox.style.display = "block";
    return;
  }

  const keys = apiKeysInput.split("\n").map(k=>k.trim()).filter(k=>k);
  document.getElementById("progressSection").style.display = "block";
  document.getElementById("summarySection").style.display = "block";
  document.getElementById("resultsSection").style.display = "block";

  let valid=0, invalid=0, limit=0;
  document.getElementById("totalKeys").innerText = keys.length;

  for(let i=0;i<keys.length;i++){
    const key = keys[i];
    const status = await checkSingleKey(key);

    if(status==="VALID") valid++;
    else if(status==="LIMIT") limit++;
    else invalid++;

    /* update counters */
    document.getElementById("validKeys").innerText   = valid;
    document.getElementById("invalidKeys").innerText = invalid;
    document.getElementById("limitKeys").innerText   = limit;

    /* progress bar */
    const progress = ((i+1)/keys.length)*100;
    document.getElementById("progressFill").style.width = progress+"%";
    document.getElementById("progressText").innerText =
      `Memeriksa: ${i+1} dari ${keys.length}`;

    /* hasil per baris */
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `
      <span class="result-key">${key}</span>
      <span class="result-status status-${status.toLowerCase()}">${status}</span>`;
    resultsList.appendChild(row);

    /* anti-spam delay 300-1200ms */
    await new Promise(r=>setTimeout(r, 300 + Math.random()*900));
  }
}
const ads = document.querySelector(".ads-box");
ads.innerHTML = ""; // bersihkan dulu

const img = document.createElement("img");
img.src = "https://gkey.pages.dev/assets/saweria.png";
img.alt = "Ads";
img.style.maxWidth = "100%";
img.style.borderRadius = "8px";
img.style.display = "block";

ads.appendChild(img);
