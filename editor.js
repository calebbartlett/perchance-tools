let perchanceData = null;

// ===============================
// Load Perchance Export
// ===============================
document.getElementById("loadBtn").addEventListener("click", async () => {
    const file = document.getElementById("fileInput").files[0];
    if (!file) {
        alert("Choose a .json.gz export first.");
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: "string" });

        perchanceData = JSON.parse(decompressed);

        document.getElementById("rawJson").textContent = JSON.stringify(perchanceData, null, 2);

        loadCharacterFields();

        document.getElementById("status").textContent = "Export loaded.";
    } catch (err) {
        console.error(err);
        alert("Failed to load export.");
    }
});

// ===============================
// Load Character Fields into UI
// ===============================
function loadCharacterFields() {
    const ai = perchanceData?.data?.data?.[0]?.aiSettings;
    if (!ai) {
        alert("Could not find aiSettings in export.");
        return;
    }

    document.getElementById("charName").value = ai.name || "";
    document.getElementById("charDescription").value = ai.description || "";
    document.getElementById("charPersonality").value = ai.personality || "";
    document.getElementById("charRoleInstructions").value = ai.roleInstructions || "";
    document.getElementById("charGreeting").value = ai.greeting || "";
}

// ===============================
// Apply Changes to JSON
// ===============================
document.getElementById("applyChangesBtn").addEventListener("click", () => {
    if (!perchanceData) {
        alert("No export loaded.");
        return;
    }

    const ai = perchanceData?.data?.data?.[0]?.aiSettings;
    if (!ai) {
        alert("Could not find aiSettings in export.");
        return;
    }

    ai.name = document.getElementById("charName").value;
    ai.description = document.getElementById("charDescription").value;
    ai.personality = document.getElementById("charPersonality").value;
    ai.roleInstructions = document.getElementById("charRoleInstructions").value;
    ai.greeting = document.getElementById("charGreeting").value;

    document.getElementById("status").textContent = "Changes applied (not downloaded yet).";
});

// ===============================
// Download Updated Export
// ===============================
document.getElementById("downloadUpdatedBtn").addEventListener("click", () => {
    if (!perchanceData) {
        alert("No export loaded.");
        return;
    }

    try {
        const jsonString = JSON.stringify(perchanceData);
        const gzipped = pako.gzip(jsonString);

        const blob = new Blob([gzipped], { type: "application/gzip" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "updated_export.json.gz";
        a.click();

        URL.revokeObjectURL(url);

        document.getElementById("status").textContent = "Updated export downloaded.";
    } catch (err) {
        console.error(err);
        document.getElementById("status").textContent = "Error generating updated export.";
    }
});
