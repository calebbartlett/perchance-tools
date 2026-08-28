// ------------------------------------------------------------
// Remove images only (Perchance‑safe)
// ------------------------------------------------------------

function removeBloat(obj, removeImages) {
  // Remove ONLY the __savedImages block
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
      if (removeImages && k === "__savedImages") {
        continue;
      }
      const cleaned = removeBloat(v, removeImages);
      if (cleaned !== undefined) newObj[k] = cleaned;
    }
    return newObj;
  }

  if (Array.isArray(obj)) {
    const newArr = [];
    for (const item of obj) {
      const cleaned = removeBloat(item, removeImages);
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
  const removeImagesCheckbox = document.getElementById("removeImages");
  const processBtn = document.getElementById("processBtn");
  const statusEl = document.getElementById("status");

  processBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      statusEl.textContent = "Please select a .json.gz file first.";
      return;
    }

    const removeImages = removeImagesCheckbox.checked;

    statusEl.textContent = "Reading file...";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Try to decompress as gzip; if it fails, assume plain JSON
      let jsonText;
      try {
        const decompressed = window.pako.ungzip(uint8, { to: "string" });
        jsonText = decompressed;
      } catch (e) {
        jsonText = new TextDecoder("utf-8").decode(uint8);
      }

      statusEl.textContent = "Parsing JSON...";
      const data = JSON.parse(jsonText);

      statusEl.textContent = "Applying scrub logic...";
      const cleaned = removeBloat(data, removeImages);

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
