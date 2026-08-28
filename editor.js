// ======================================================
// Perchance Tools - Dexie Import + JSON Viewer + Characters
// ======================================================

let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";
let charactersRows = [];

// GLOBAL IMPORT LISTENER
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const isGzip = file.name.endsWith(".gz");
        let decompressed;

        if (isGzip) {
            const arrayBuffer = await file.arrayBuffer();
            decompressed = pako.ungzip(arrayBuffer, { to: "string" });
        } else {
            decompressed = await file.text();
        }

        rawJsonText = decompressed;
        perchanceData = JSON.parse(decompressed);
        prettyJsonText = JSON.stringify(perchanceData, null, 2);

        document.getElementById("importStatus").textContent = "File loaded";

        // Populate viewer (raw by default)
        const viewer = document.getElementById("jsonViewer");
        if (viewer) viewer.textContent = rawJsonText;

        // Extract characters from Dexie structure
        extractCharactersFromDexie();
        populateCharacterDropdown();

        // Load first character if available
        if (charactersRows.length > 0) {
            loadCharacterIntoEditor(0);
        }

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
// Dexie characters extraction
// ======================================================
function extractCharactersFromDexie() {
    charactersRows = [];

    if (!perchanceData || !perchanceData.data || !Array.isArray(perchanceData.data.data)) {
        console.warn("Dexie structure not found.");
        return;
    }

    const tablesDump = perchanceData.data.data;

    const charactersTable = tablesDump.find(t => t.tableName === "characters");
    if (!charactersTable || !Array.isArray(charactersTable.rows)) {
        console.warn("No 'characters' table found in Dexie export.");
        return;
    }

    charactersRows = charactersTable.rows;
}

// ======================================================
// Populate dropdown with name + roleInstruction preview
// ======================================================
function populateCharacterDropdown() {
    const select = document.getElementById("characterSelect");
    if (!select) return;

    select.innerHTML = "";

    if (charactersRows.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "(no characters found)";
        select.appendChild(opt);
        return;
    }

    charactersRows.forEach((row, index) => {
        const name = row.name || `Character ${index + 1}`;
        const role = row.roleInstruction;

        const label = role
            ? `${name} (${role})`
            : name;

        const option = document.createElement("option");
        option.value = index;
        option.textContent = label;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        const idx = parseInt(select.value, 10);
        if (!isNaN(idx)) {
            loadCharacterIntoEditor(idx);
        }
    });
}

// ======================================================
// Load selected character into editor fields
// ======================================================
function loadCharacterIntoEditor(index) {
    const row = charactersRows[index];
    if (!row) return;

    document.getElementById("charName").value = row.name || "";
    document.getElementById("charRoleInstructions").value = row.roleInstruction || "";
    document.getElementById("charReminder").value = row.reminderMessage || "";
    document.getElementById("charGeneralWriting").value = row.generalWritingInstructions || "";

    // Initial greeting from initialMessages[0].content if present
    let greeting = "";
    if (Array.isArray(row.initialMessages) && row.initialMessages.length > 0) {
        const first = row.initialMessages[0];
        if (first && typeof first.content === "string") {
            greeting = first.content;
        }
    }
    document.getElementById("charGreeting").value = greeting;
}
