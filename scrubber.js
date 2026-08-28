// ------------------------------------------------------------
// Remove __savedImages and <image>...</image> blocks (Perchance‑safe)
// ------------------------------------------------------------

// Counters
let savedImagesRemoved = 0;
let imageTagsRemoved = 0;

function stripImageTags(str) {
  if (typeof str !== "string") return str;

  // Count how many <image>...</image> blocks exist before removal
  const matches = str.match(/<image>[\s\S]*?<\/image>/gi);
  if (matches) {
    imageTagsRemoved += matches.length;
  }

  return str.replace(/<image>[\s\S]*?<\/image>/gi, "");
}

function removeBloat(obj) {
  // Strings: remove <image>...</image>
  if (typeof obj === "string") {
    return stripImageTags(obj);
  }

  // Arrays: recurse (do NOT remove null/empty)
  if (Array.isArray(obj)) {
    return obj.map(item => removeBloat(item));
  }

  // Objects: remove __savedImages and recurse
  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {

      if (k === "__savedImages") {
        savedImagesRemoved++;   // count removal
        continue;               // skip this key entirely
      }

      newObj[k] = removeBloat(v);
    }
    return newObj;
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

  // Stats elements
  const origSizeEl = document.getElementById("origSize");
  const cleanSizeEl = document.getElementById("cleanSize");
  const reductionEl = document.getElementById("reduction");
  const savedImagesCountEl = document.getElementById("savedImagesCount");
  const imageTagCountEl = document.getElementById("imageTagCount");

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

      // Reset counters for each run
      savedImagesRemoved = 0;
      imageTagsRemoved = 0;

      // Original size (gzip size)
      const origSize = uint8.byteLength;

      let jsonText;
      try {
        jsonText = window.pako.ungzip(uint8, { to: "string" });
      } catch (e) {
        jsonText = new TextDecoder("utf-8").decode(uint8);
      }

      statusEl.textContent = "Parsing JSON...";
      const data = JSON.parse(jsonText);

      statusEl.textContent = "Removing images...";
      const cleaned = removeBloat(data);

      statusEl.textContent = "Serializing cleaned JSON...";
      const cleanedText = JSON.stringify(cleaned);

      statusEl.textContent = "Compressing to gzip...";
      const gzipped = window.pako.gzip(cleanedText);
      const cleanSize = gzipped.byteLength;

      const reductionPct = ((origSize - cleanSize) / origSize * 100).toFixed(2);

      // Update stats panel
      origSizeEl.textContent = `${origSize.toLocaleString()} bytes`;
      cleanSizeEl.textContent = `${cleanSize.toLocaleString()} bytes`;
      reductionEl.textContent = `${reductionPct}%`;
      savedImagesCountEl.textContent = savedImagesRemoved.toLocaleString();
      imageTagCountEl.textContent = imageTagsRemoved.toLocaleString();

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

 
