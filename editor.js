let perchanceData = null;
let characters = [];
let currentIndex = 0;

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

        document.getElementById("rawJson").textContent =
            JSON.stringify(perchanceData, null, 2);

        loadCharacterList();
        loadCharacterFields(0);

        document.getElementById("status").textContent = "Export loaded.";
    } catch (err) {
        console.error(err);
        alert("Failed to load export.");
    }
});

// ===============================
// Load Character List (Dropdown)
// ===============================
function loadCharacterList() {
    characters = perchanceData?.data?.data?.[0]?.characters || [];

    const select = document.getElementById("characterSelect");
    select.innerHTML = "";

    characters.forEach((char, i) => {
        const ai = char.aiSettings || {};
        const name = ai.name || `Character ${i + 1}`;
        const role = ai.roleInstructions ? ai.roleInstructions.slice(0, 40) : "";
        const preview = role ? ` — (${role}...)` : "";

        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${i + 1}: ${name}${preview}`;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        currentIndex = parseInt(select.value);
        loadCharacterFields(currentIndex);
    });
}

// ===============================
// Load Character Fields into UI
// ===============================
function loadCharacterFields(index) {
    const ai = characters[index]?.aiSettings;
    if (!ai) {
        alert("Could not find aiSettings for this character.");
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

    const ai = characters[currentIndex]?.aiSettings;
    if (!ai) {
        alert("Could not find aiSettings for this character.");
        return;
    }

    ai.name = document.getElementById("charName").value;
    ai.description = document.getElementById("charDescription").value;
    ai.personality = document.getElementById("charPersonality").value;
    ai.roleInstructions = document.getElementById("charRoleInstructions").value;
    ai.greeting = document.getElementById("charGreeting").value;

    document.getElementById("status").textContent =
        `Changes applied to character ${currentIndex + 1}.`;
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

        document.getElementById("status").textContent =
            "Updated export downloaded.";
    } catch (err) {
        console.error(err);
        document.getElementById("status").textContent =
            "Error generating updated export.";
    }
});
