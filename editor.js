/************************************************************
 *  SMARHAMR — EDITOR.JS (FULL FILE, CHUNKED DELIVERY)
 *  CHUNK 2A — File header, globals, import handler,
 *             JSON viewer, character extraction,
 *             character editor core, top bar buttons
 ************************************************************/

// Global Perchance export object
let perchanceData = null;

// Raw + pretty JSON viewer buffers
let rawJsonText = "";
let prettyJsonText = "";
let prettyJsonLines = [];

// Character rows extracted from Dexie
let charactersRows = [];
let currentCharacterIndex = 0;

/************************************************************
 *  IMPORT HANDLER — LOAD .json OR .json.gz
 ************************************************************/
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
        prettyJsonLines = prettyJsonText.split("\n");

        document.getElementById("importStatus").textContent = "File loaded";
        document.getElementById("jsonViewer").textContent = rawJsonText;

        extractCharactersFromDexie();
        populateCharacterDropdown();

        if (charactersRows.length > 0) {
            loadCharacterIntoEditor(0);
        }

        // World Engine will be loaded in CHUNK 2B
        // loadWorldFromLore();
        // loadWorldIntoUI();

    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});

/************************************************************
 *  JSON VIEWER BUTTONS
 ************************************************************/
document.getElementById("showRawBtn").addEventListener("click", () => {
    document.getElementById("jsonViewer").textContent =
        rawJsonText || "(no JSON loaded yet)";
});

document.getElementById("showPrettyBtn").addEventListener("click", () => {
    if (!prettyJsonLines.length) {
        document.getElementById("jsonViewer").textContent = "(no JSON loaded yet)";
        return;
    }
    const first500 = prettyJsonLines.slice(0, 500).join("\n");
    document.getElementById("jsonViewer").textContent = first500;
});

document.getElementById("downloadPrettyBtn").addEventListener("click", () => {
    if (!prettyJsonText) return;
    const blob = new Blob([prettyJsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pretty-export.json";
    a.click();
    URL.revokeObjectURL(url);
});

/************************************************************
 *  CHARACTER EXTRACTION FROM DEXIE
 ************************************************************/
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

/************************************************************
 *  POPULATE CHARACTER DROPDOWN
 ************************************************************/
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
        const option = document.createElement("option");
        option.value = index;
        option.textContent = name;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        const idx = parseInt(select.value, 10);
        if (!isNaN(idx)) {
            currentCharacterIndex = idx;
            loadCharacterIntoEditor(idx);
        }
    });
}

/************************************************************
 *  LOAD CHARACTER INTO EDITOR
 ************************************************************/
function loadCharacterIntoEditor(index) {
    const row = charactersRows[index];
    if (!row) return;

    const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v ?? "";
    };

    // BASIC
    setVal("charName", row.name || "");
    setVal("charRoleInstructions", row.roleInstruction || "");
    setVal("charReminder", row.reminderMessage || "");
    setVal("charGeneralWriting", row.generalWritingInstructions || "");

    let greeting = "";
    if (Array.isArray(row.initialMessages) && row.initialMessages.length > 0) {
        const first = row.initialMessages[0];
        if (first && typeof first.content === "string") {
            greeting = first.content;
        }
    }
    setVal("charGreeting", greeting);

    // ADVANCED: MESSAGE & PROMPTS
    setVal("charMessageWrapperStyle", row.messageWrapperStyle || "");
    setVal("charImagePromptPrefix", row.imagePromptPrefix || "");
    setVal("charImagePromptSuffix", row.imagePromptSuffix || "");
    setVal("charImagePromptTriggers", row.imagePromptTriggers || "");
    setVal("charMessageInputPlaceholder", row.messageInputPlaceholder || "");

    // ADVANCED: MODEL & TOKENS
    setVal("charModelName", row.modelName || "");

    const tempVal = document.getElementById("charTemperature").value;
    if (tempVal !== "") row.temperature = parseFloat(tempVal);
    else delete row.temperature;

    const maxTokensVal = document.getElementById("charMaxTokensPerMessage").value;
    if (maxTokensVal !== "") row.maxTokensPerMessage = parseInt(maxTokensVal, 10);
    else delete row.maxTokensPerMessage;

    setVal("charTextEmbeddingModelName", row.textEmbeddingModelName || "");
    setVal("charFitMessagesMethod", row.fitMessagesInContextMethod || "");
    setVal("charAutoGenerateMemories", row.autoGenerateMemories || "");

    // ADVANCED: AVATAR & SCENE
    if (!row.avatar) row.avatar = {};
    setVal("charAvatarUrl", row.avatar.url || "");

    const avatarSizeVal = row.avatar.size ?? "";
    setVal("charAvatarSize", avatarSizeVal);

    setVal("charAvatarShape", row.avatar.shape || "");

    if (!row.scene) row.scene = {};
    if (!row.scene.background) row.scene.background = {};
    if (!row.scene.music) row.scene.music = {};

    setVal("charSceneBackgroundUrl", row.scene.background.url || "");
    setVal("charSceneMusicUrl", row.scene.music.url || "");

    // ADVANCED: META & FLAGS
    setVal("charMetaTitle", row.metaTitle || "");
    setVal("charMetaDescription", row.metaDescription || "");
    setVal("charMetaImage", row.metaImage || "");

    const streaming = row.streamingResponse;
    const streamingEl = document.getElementById("charStreamingResponse");
    if (streamingEl) streamingEl.value = (streaming === false ? "false" : "true");

    setVal("charFolderPath", row.folderPath || "");

    const profileStatus = document.getElementById("profileStatus");
    if (profileStatus) profileStatus.textContent =
        `Loaded character ${index + 1}.`;
}

/************************************************************
 *  APPLY CHANGES TO CURRENT CHARACTER
 ************************************************************/
function applyChangesToCurrentCharacter() {
    if (!perchanceData || charactersRows.length === 0) {
        alert("No export or characters loaded.");
        return;
    }

    const row = charactersRows[currentCharacterIndex];
    if (!row) {
        alert("Selected character not found.");
        return;
    }

    // BASIC
    row.name = document.getElementById("charName").value;
    row.roleInstruction = document.getElementById("charRoleInstructions").value;
    row.reminderMessage = document.getElementById("charReminder").value;
    row.generalWritingInstructions = document.getElementById("charGeneralWriting").value;

    const greeting = document.getElementById("charGreeting").value;
    if (!Array.isArray(row.initialMessages)) {
        row.initialMessages = [];
    }
    if (!row.initialMessages[0]) {
        row.initialMessages[0] = { role: "assistant", content: "" };
    }
    row.initialMessages[0].content = greeting;

    // ADVANCED: MESSAGE & PROMPTS
    row.messageWrapperStyle = document.getElementById("charMessageWrapperStyle").value;
    row.imagePromptPrefix = document.getElementById("charImagePromptPrefix").value;
    row.imagePromptSuffix = document.getElementById("charImagePromptSuffix").value;
    row.imagePromptTriggers = document.getElementById("charImagePromptTriggers").value;
    row.messageInputPlaceholder = document.getElementById("charMessageInputPlaceholder").value;

    // ADVANCED: MODEL & TOKENS
    row.modelName = document.getElementById("charModelName").value;

    const tempVal = document.getElementById("charTemperature").value;
    if (tempVal !== "") row.temperature = parseFloat(tempVal);
    else delete row.temperature;

    const maxTokensVal = document.getElementById("charMaxTokensPerMessage").value;
    if (maxTokensVal !== "") row.maxTokensPerMessage = parseInt(maxTokensVal, 10);
    else delete row.maxTokensPerMessage;

    row.textEmbeddingModelName = document.getElementById("charTextEmbeddingModelName").value;
    row.fitMessagesInContextMethod = document.getElementById("charFitMessagesMethod").value;
    row.autoGenerateMemories = document.getElementById("charAutoGenerateMemories").value;

    // ADVANCED: AVATAR & SCENE
    if (!row.avatar) row.avatar = {};
    row.avatar.url = document.getElementById("charAvatarUrl").value;

    const avatarSizeVal = document.getElementById("charAvatarSize").value;
    if (avatarSizeVal !== "") row.avatar.size = parseInt(avatar.value, 10);
    else delete row.avatar.size;

    row.avatar.shape = document.getElementById("charAvatarShape").value;

    if (!row.scene) row.scene = {};
    if (!row.scene.background) row.scene.background = {};
    if (!row.scene.music) row.scene.music = {};

    row.scene.background.url = document.getElementById("charSceneBackgroundUrl").value;
    row.scene.music.url = document.getElementById("charSceneMusicUrl").value;

    // ADVANCED: META & FLAGS
    row.metaTitle = document.getElementById("charMetaTitle").value;
    row.metaDescription = document.getElementById("charMetaDescription").value;
    row.metaImage = document.getElementById("charMetaImage").value;

    const streamingValue = document.getElementById("charStreamingResponse").value;
    row.streamingResponse = (streamingValue === "false") ? false : true;

    row.folderPath = document.getElementById("charFolderPath").value;

    const profileStatus = document.getElementById("profileStatus");
    if (profileStatus) profileStatus.textContent =
        `Changes applied to character ${currentCharacterIndex + 1}.`;
}

/************************************************************
 *  TOP BAR BUTTONS
 ************************************************************/
const applyBtnTop = document.getElementById("applyChangesBtnTop");
if (applyBtnTop) {
    applyBtnTop.addEventListener("click", () => {
        applyChangesToCurrentCharacter();
    });
}

const downloadBtnTop = document.getElementById("downloadUpdatedBtnTop");
if (downloadBtnTop) {
    downloadBtnTop.addEventListener("click", () => {
        // Export logic will be added in CHUNK 2B
        // downloadUpdatedExport();
    });
}

const scrubBtnTop = document.getElementById("scrubBtnTop");
if (scrubBtnTop) {
    scrubBtnTop.addEventListener("click", () => {
        const btn = document.getElementById("processBtn");
        if (btn) btn.click();
    });
}

/************************************************************
 *  LORE TABLE HANDLING — FIND / CREATE
 ************************************************************/
function ensureLoreTable() {
    if (!perchanceData) return null;

    if (!perchanceData.data) perchanceData.data = {};
    if (!Array.isArray(perchanceData.data.data)) perchanceData.data.data = [];

    let loreTable = perchanceData.data.data.find(t => t.tableName === "lore");

    if (!loreTable) {
        loreTable = {
            tableName: "lore",
            rows: []
        };
        perchanceData.data.data.push(loreTable);
    } else if (!Array.isArray(loreTable.rows)) {
        loreTable.rows = [];
    }

    return loreTable;
}

/************************************************************
 *  FIND WORLD ENGINE LORE ROW
 ************************************************************/
function findWorldLoreRow() {
    const loreTable = ensureLoreTable();
    if (!loreTable) return { row: null, table: null };

    const row = loreTable.rows.find(r => {
        const title = r.title ?? r.name ?? "";
        return title === WORLD_LORE_TITLE;
    });

    return { row: row || null, table: loreTable };
}

/************************************************************
 *  LOAD WORLD ENGINE FROM LORE
 ************************************************************/
function loadWorldFromLore() {
    worldObj = defaultWorldObject();

    if (!perchanceData || !perchanceData.data || !Array.isArray(perchanceData.data.data)) {
        return; // no dexie structure
    }

    const { row } = findWorldLoreRow();
    if (!row) {
        return; // no existing world engine block
    }

    const content = row.content ?? row.body ?? row.text ?? "";
    if (!content || typeof content !== "string") return;

    try {
        const parsed = parseWorldEngineText(content);
        worldObj = parsed;
    } catch (err) {
        console.warn("WorldEngine block could not be parsed:", err);
    }
}

/************************************************************
 *  SAVE WORLD ENGINE INTO LORE
 ************************************************************/
function saveWorldToLore() {
    if (!perchanceData) {
        console.warn("No perchanceData available; cannot save world to lore.");
        return;
    }

    const { row, table } = findWorldLoreRow();
    const serialized = generateWorldEngineText(worldObj);

    if (row) {
        // Update existing row
        if ("content" in row) row.content = serialized;
        else if ("body" in row) row.body = serialized;
        else if ("text" in row) row.text = serialized;
        else row.content = serialized;
    } else {
        // Create new row
        const newRow = {
            id: `worldengine-${Date.now()}`,
            title: WORLD_LORE_TITLE,
            content: serialized
        };
        table.rows.push(newRow);
    }
}

/************************************************************
 *  EXPORT — GENERATE .json.gz WITH TIMESTAMP
 ************************************************************/
function downloadUpdatedExport() {
    if (!perchanceData) {
        alert("No export loaded.");
        return;
    }

    try {
        // Save world engine into lore before exporting
        saveWorldToLore();

        // Timestamp YYYYMMDDhhmm
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        // Store timestamp inside meta
        if (!perchanceData.meta) perchanceData.meta = {};
        perchanceData.meta.exportTimestamp = timestamp;

        // Filename
        const filename = `export_${timestamp}.json.gz`;

        const jsonString = JSON.stringify(perchanceData);
        const gzipped = pako.gzip(jsonString);

        const blob = new Blob([gzipped], { type: "application/gzip" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        document.getElementById("importStatus").textContent = "Export complete.";
    } catch (err) {
        console.error("Error generating updated export:", err);
        alert("Error generating updated export.");
    }
}

/************************************************************
 *  CONNECT EXPORT BUTTON TO EXPORT FUNCTION
 ************************************************************/
if (downloadBtnTop) {
    downloadBtnTop.addEventListener("click", () => {
        downloadUpdatedExport();
    });
}
