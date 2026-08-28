// ------------------------------------------------------------
// Remove __savedImages only (always on, Perchance‑safe)
// ------------------------------------------------------------

function removeBloat(obj) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "__savedImages") {
        continue; // always remove images
      }
      const cleaned = removeBloat(v);
      if (cleaned !== undefined) newObj[k] = cleaned;
    }
    return newObj;
  }

  if (Array.isArray(obj)) {
    const newArr = [];
    for (const item of obj) {
      const cleaned = removeBloat(item);
      if (cleaned !== undefined) newArr.push(cleaned);
    }
    return newArr;
  }

  return obj;
}

// ------------------------------------------------------------
// Wire up the UI
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const processBtn = document.getElementById("processBtn");
  const statusEl = document.getElementById("status");

  processBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      statusEl.textContent = "Please select a .json.gz file first.";
      return;
    }

    statusEl.textContent = "Reading file...";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Try gzip first; fall back to plain JSON
      let jsonText;
      try {
        jsonText = window.pako.ungzip(uint8, { to: "string" });
      } catch (e) {
        jsonText = new TextDecoder("utf-8").decode(uint8);
      }

      statusEl.textContent = "Parsing JSON...";
      const data = JSON.parse(jsonText);

      statusEl.textContent = "Removing __savedImages...";
      const cleaned = removeBloat(data);

      statusEl.textContent = "Serializing cleaned JSON...";
      const cleanedText = JSON.stringify(cleaned);

      statusEl.textContent = "Compressing to gzip...";
      const gzipped = window.pako.gzip(cleanedText);
      const blob = new Blob([gzipped], { type: "application/gzip" });

      const outName = "export.scrub.browser.json.gz";
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      statusEl.textContent = `Done. Downloaded: ${outName}`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + err.message;
    }
  });
});
  
