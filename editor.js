// ===============================
// Perchance Character Extraction
// ===============================

// This will hold the parsed export JSON
let perchanceData = null;

// Hook into the same file input used by the scrubber
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

        // Populate the Profiles tab
        populateCharacterEditor();

        document.getElementById("status").textContent = "Export loaded. Profiles tab updated.";
    } catch (err) {
        console.error(err);
        document.getElementById("status").textContent = "Error loading export.";
    }
});


// ===============================
// Populate Profiles Tab Fields
// ===============================
function populateCharacterEditor() {
    if (!perchanceData) return;

    // Perchance stores character data in aiSettings
    const ai = perchanceData?.data?.data?.[0]?.aiSettings;
    if (!ai) {
        alert("Could not find aiSettings in export.");
        return;
    }

    // Fill fields
    document.getElementById("charName").value = ai.name || "";
    document.getElementById("charDescription").value = ai.description || "";
    document.getElementById("charPersonality").value = ai.personality || "";
    document.getElementById("charRoleInstructions").value = ai.roleInstructions || "";
    document.getElementById("charGreeting").value = ai.greeting || "";
}
