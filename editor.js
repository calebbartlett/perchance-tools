// ======================================================
// Perchance Tools - Character Extraction Logic
// ======================================================

// Holds the parsed Perchance export JSON
let perchanceData = null;

// Listen for file uploads from the GLOBAL import toolbar
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Decompress gzip using pako
        const decompressed = pako.ungzip(arrayBuffer, { to: "string" });

        // Parse JSON
        perchanceData = JSON.parse(decompressed);

        // Update status
        document.getElementById("importStatus").textContent = "File loaded";

        // Populate the Profiles tab
        populateCharacterEditor();

    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});


// ======================================================
// Populate Profiles Tab Fields
// ======================================================
function populateCharacterEditor() {
    if (!perchanceData) {
        console.warn("No export loaded yet.");
        return;
    }

    const ai = perchanceData?.data?.data?.[0]?.aiSettings;

    if (!ai) {
        alert("Could not find aiSettings in export. Character extraction failed.");
        return;
    }

    document.getElementById("charName").value = ai.name || "";
    document.getElementById("charDescription").value = ai.description || "";
    document.getElementById("charPersonality").value = ai.personality || "";
    document.getElementById("charRoleInstructions").value = ai.roleInstructions || "";
    document.getElementById("charGreeting").value = ai.greeting || "";
}
