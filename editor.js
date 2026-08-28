// ======================================================
// Perchance Tools - Multi-Character Extraction Logic
// ======================================================

let perchanceData = null;
let characters = [];

// GLOBAL IMPORT LISTENER
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const decompressed = pako.ungzip(arrayBuffer, { to: "string" });
        perchanceData = JSON.parse(decompressed);

        document.getElementById("importStatus").textContent = "File loaded";

        extractCharacters();
        populateCharacterDropdown();
        loadCharacterIntoEditor(0);

    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});


// ======================================================
// Extract characters from multi-character export
// ======================================================
function extractCharacters() {
    const root = perchanceData?.data?.data?.[0];

    if (!root || !root.characters) {
        alert("This export does not contain a characters array.");
        characters = [];
        return;
    }

    characters = root.characters.map(c => c.aiSettings || {});
}


// ======================================================
// Populate dropdown with name + role preview
// ======================================================
function populateCharacterDropdown() {
    const select = document.getElementById("characterSelect");
    select.innerHTML = "";

    characters.forEach((char, index) => {
        const name = char.name || `Character ${index + 1}`;
        const role = char.roleInstructions;

        const label = role
            ? `${name} (${role})`
            : name;

        const option = document.createElement("option");
        option.value = index;
        option.textContent = label;

        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        loadCharacterIntoEditor(select.value);
    });
}


// ======================================================
// Load selected character into editor fields
// ======================================================
function loadCharacterIntoEditor(index) {
    const char = characters[index];
    if (!char) return;

    document.getElementById("charName").value = char.name || "";
    document.getElementById("charDescription").value = char.description || "";
    document.getElementById("charPersonality").value = char.personality || "";
    document.getElementById("charRoleInstructions").value = char.roleInstructions || "";
    document.getElementById("charGreeting").value = char.greeting || "";
}
