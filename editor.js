// ======================================================
// Perchance Tools - Import + JSON Viewer
// ======================================================

let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";

// GLOBAL IMPORT LISTENER
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = pako.ungzip(arrayBuffer, { to: "string" });

        // Store raw and parsed JSON
        rawJsonText = decompressed;
        perchanceData = JSON.parse(decompressed);
        prettyJsonText = JSON.stringify(perchanceData, null, 2);

        // Update status
        document.getElementById("importStatus").textContent = "File loaded";

        // Populate viewer with raw JSON by default
        const viewer = document.getElementById("jsonViewer");
        if (viewer) {
            viewer.textContent = rawJsonText;
        }

        // Profiles / World / Lore extraction will be added once structure is inspected
    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});

// JSON VIEWER TOGGLE BUTTONS
document.getElementById("showRawBtn").addEventListener("click", () => {
    const viewer = document.getElementById("jsonViewer");
    if (!viewer) return;
    viewer.textContent = rawJsonText || "(no JSON loaded yet)";
});

document.getElementById("showPrettyBtn").addEventListener("click", () => {
    const viewer = document.getElementById("jsonViewer");
    if (!viewer) return;
    viewer.textContent = prettyJsonText || "(no JSON loaded yet)";
});

// ======================================================
// Placeholder: Profiles editor wiring will come later
// ======================================================

function loadCharacterIntoEditor(index) {
    // Intentionally empty for now.
    // Once we know the JSON structure, we’ll wire this to perchanceData.
}
