/************************************************************
 *  SMarHamr — EDITOR.JS (Global Lore + Numeric Template)
 ************************************************************/

let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";
let prettyJsonLines = [];

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
            currentCharacterIndex = 0;
            loadCharacterIntoEditor(0);
        }

        // load global lore once export is loaded
        loadGlobalLoreIntoEditor();

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
 *  CHARACTER EXTRACTION
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
        console.warn("No 'characters' table found.");
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
            // lore is global, but we can refresh it when switching
            loadGlobalLoreIntoEditor();
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

    // MESSAGE & PROMPTS
    setVal("charMessageWrapperStyle", row.messageWrapperStyle || "");
    setVal("charImagePromptPrefix", row.imagePromptPrefix || "");
    setVal("charImagePromptSuffix", row.imagePromptSuffix || "");
    setVal("charImagePromptTriggers", row.imagePromptTriggers || "");
    setVal("charMessageInputPlaceholder", row.messageInputPlaceholder || "");

    // MODEL & TOKENS
    setVal("charModelName", row.modelName || "");
    setVal("charTemperature", row.temperature ?? "");
    setVal("charMaxTokensPerMessage", row.maxTokensPerMessage ?? "");
    setVal("charTextEmbeddingModelName", row.textEmbeddingModelName || "");
    setVal("charFitMessagesMethod", row.fitMessagesInContextMethod || "");
    setVal("charAutoGenerateMemories", row.autoGenerateMemories || "");

    // AVATAR & SCENE
    if (!row.avatar) row.avatar = {};
    setVal("charAvatarUrl", row.avatar.url || "");
    setVal("charAvatarSize", row.avatar.size ?? "");
    setVal("charAvatarShape", row.avatar.shape || "");

    if (!row.scene) row.scene = {};
    if (!row.scene.background) row.scene.background = {};
    if (!row.scene.music) row.scene.music = {};

    setVal("charSceneBackgroundUrl", row.scene.background.url || "");
    setVal("charSceneMusicUrl", row.scene.music.url || "");

    // META & FLAGS
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
 *  APPLY PROFILE CHANGES
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

    // MESSAGE & PROMPTS
    row.messageWrapperStyle = document.getElementById("charMessageWrapperStyle").value;
    row.imagePromptPrefix = document.getElementById("charImagePromptPrefix").value;
    row.imagePromptSuffix = document.getElementById("charImagePromptSuffix").value;
    row.imagePromptTriggers = document.getElementById("charImagePromptTriggers").value;
    row.messageInputPlaceholder = document.getElementById("charMessageInputPlaceholder").value;

    // MODEL & TOKENS
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

    // AVATAR & SCENE
    if (!row.avatar) row.avatar = {};
    row.avatar.url = document.getElementById("charAvatarUrl").value;

    const avatarSizeVal = document.getElementById("charAvatarSize").value;
    if (avatarSizeVal !== "") row.avatar.size = parseInt(avatarSizeVal, 10);
    else delete row.avatar.size;

    row.avatar.shape = document.getElementById("charAvatarShape").value;

    if (!row.scene) row.scene = {};
    if (!row.scene.background) row.scene.background = {};
    if (!row.scene.music) row.scene.music = {};

    row.scene.background.url = document.getElementById("charSceneBackgroundUrl").value;
    row.scene.music.url = document.getElementById("charSceneMusicUrl").value;

    // META & FLAGS
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
 *  APPLY BUTTON WIRING (PER TAB)
 ************************************************************/
document.getElementById("applyProfileBtn")
    .addEventListener("click", applyChangesToCurrentCharacter);

document.getElementById("applyLoreBtn")
    .addEventListener("click", saveLoreToPerchance);

document.getElementById("applyMemoryBtn")
    .addEventListener("click", () => {
        alert("Memory editing not implemented yet.");
    });

/************************************************************
 *  LORE TAB — GLOBAL LORE (Perchance-style)
 ************************************************************/
function loadGlobalLoreIntoEditor() {
    const tables = perchanceData?.data?.data;
    if (!tables) {
        document.getElementById("loreEditor").value = "";
        return;
    }

    const loreTable = tables.find(t => t.tableName === "lore");
    if (!loreTable || !Array.isArray(loreTable.rows) || loreTable.rows.length === 0) {
        document.getElementById("loreEditor").value = "";
        return;
    }

    const loreRow = loreTable.rows[0];
    const loreText = loreRow.text ?? "";

    document.getElementById("loreEditor").value = loreText;
}

function saveLoreToPerchance() {
    const tables = perchanceData?.data?.data;
    if (!tables) {
        alert("No export loaded.");
        return;
    }

    const loreTable = tables.find(t => t.tableName === "lore");
    if (!loreTable || !Array.isArray(loreTable.rows) || loreTable.rows.length === 0) {
        alert("Lore table not found.");
        return;
    }

    const loreRow = loreTable.rows[0];
    loreRow.text = document.getElementById("loreEditor").value;

    alert("Global lore saved.");
}

document.getElementById("generateLoreTemplateBtn")
    .addEventListener("click", () => {
        const template = `
World Metrics
-------------
Magic Level: 3/10
Tech Level: 7/10
Cultural Pressure: 4/10
Environmental Pressure: 5/10
Supernatural Pressure: 2/10
Stability Index: 6/10
Threat Index: 3/10
Discovery Index: 7/10

World Overview
--------------
A mostly stable, modern‑tech world with low‑level magic phenomena. Society is comfortable but curious, with rising interest in ancient mysteries and subtle supernatural events.

Geography & Environment
-----------------------
• Climate mostly temperate with mild extremes.
• Environmental Pressure (5/10): Occasional natural anomalies near ley‑current hotspots.
• No catastrophic zones; exploration is safe but intriguing.

Cultures & Societies
--------------------
• Cultural Pressure (4/10): Minor tensions between tradition and innovation.
• Most societies are cooperative, globally connected, and moderately progressive.
• Subcultures exist around magic folklore and scientific exploration.

Technology & Magic
------------------
• Tech Level (7/10): Comparable to early 21st‑century Earth with emerging advanced materials.
• Magic Level (3/10): Rare, subtle, often mistaken for intuition or coincidence.
• Magic is not systematized; no formal schools or institutions.

Factions & Power Structures
---------------------------
• Stability Index (6/10): Governments are functional, alliances mostly stable.
• The Archive: Neutral researchers cataloging anomalies.
• Meridian Council: Tech‑forward industrial alliance.
• Solari Clans: Tradition‑focused nomadic groups.

History & Timeline
------------------
• 800 years ago: The Shattering — collapse of ancient empires.
• 200 years ago: Industrial rise.
• 40 years ago: Rediscovery of ley currents.
• Present: Growing interest in pre‑Shattering ruins.

Current State of the World
--------------------------
• Threat Index (3/10): Low — anomalies are strange but rarely dangerous.
• Discovery Index (7/10): High — explorers uncover ruins, artifacts, and unexplained signals.
• Public curiosity is rising; governments begin funding research.

Notes
-----
• These numeric values give users a baseline to adjust.
• Increase or decrease any metric to shift tone, danger, or complexity.
`.trim();

        document.getElementById("loreEditor").value = template;
    });

/************************************************************
 *  EXPORT — GENERATE .json.gz
 ************************************************************/
function downloadUpdatedExport() {
    if (!perchanceData) {
        alert("No export loaded.");
        return;
    }

    try {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        if (!perchanceData.meta) perchanceData.meta = {};
        perchanceData.meta.exportTimestamp = timestamp;

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
 *  CONNECT EXPORT & SCRUB BUTTONS
 ************************************************************/
document.getElementById("downloadUpdatedBtnTop")
    .addEventListener("click", downloadUpdatedExport);

document.getElementById("scrubBtnTop")
    .addEventListener("click", () => {
        const btn = document.getElementById("processBtn");
        if (btn) btn.click();
    });

/************************************************************
 *  SCRUBBER INTEGRATION
 ************************************************************/
const processBtn = document.getElementById("processBtn");
if (processBtn) {
    processBtn.addEventListener("click", () => {
        if (!rawJsonText) {
            alert("No file loaded.");
            return;
        }

        try {
            const result = scrubExport(rawJsonText);

            document.getElementById("jsonViewer").textContent = result.cleanedJson;

            perchanceData = JSON.parse(result.cleanedJson);
            rawJsonText = result.cleanedJson;

            extractCharactersFromDexie();
            populateCharacterDropdown();

            if (charactersRows.length > 0) {
                currentCharacterIndex = 0;
                loadCharacterIntoEditor(0);
            }

            // refresh global lore after scrub
            loadGlobalLoreIntoEditor();

            const statusEl = document.getElementById("status");
            if (statusEl) statusEl.textContent = "Scrub complete.";
        } catch (err) {
            console.error("Scrub error:", err);
            alert("Scrub failed.");
        }
    });
}

/************************************************************
 *  END OF FILE
 ************************************************************/
console.log("SmarHamr editor.js (Global Lore + Numeric Template) fully loaded.");
