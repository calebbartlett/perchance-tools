let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";
let prettyJsonLines = [];
let charactersRows = [];

// IMPORT HANDLER
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

    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});

// VIEWER BUTTONS
document.getElementById("showRawBtn").addEventListener("click", () => {
    document.getElementById("jsonViewer").textContent = rawJsonText || "(no JSON loaded yet)";
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

// DEXIE CHARACTER EXTRACTION
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

// POPULATE DROPDOWN (names only)
function populateCharacterDropdown() {
    const select = document.getElementById("characterSelect");
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
        if (!isNaN(idx)) loadCharacterIntoEditor(idx);
    });
}

// LOAD CHARACTER INTO FULL EDITOR
function loadCharacterIntoEditor(index) {
    const row = charactersRows[index];
    if (!row) return;

    // BASIC
    document.getElementById("charName").value = row.name || "";
    document.getElementById("charRoleInstructions").value = row.roleInstruction || "";
    document.getElementById("charReminder").value = row.reminderMessage || "";
    document.getElementById("charGeneralWriting").value = row.generalWritingInstructions || "";

    let greeting = "";
    if (Array.isArray(row.initialMessages) && row.initialMessages.length > 0) {
        const first = row.initialMessages[0];
        if (first && typeof first.content === "string") {
            greeting = first.content;
        }
    }
    document.getElementById("charGreeting").value = greeting;

    // ADVANCED: MESSAGE & PROMPTS
    document.getElementById("charMessageWrapperStyle").value = row.messageWrapperStyle || "";
    document.getElementById("charImagePromptPrefix").value = row.imagePromptPrefix || "";
    document.getElementById("charImagePromptSuffix").value = row.imagePromptSuffix || "";
    document.getElementById("charImagePromptTriggers").value = row.imagePromptTriggers || "";
    document.getElementById("charMessageInputPlaceholder").value = row.messageInputPlaceholder || "";

    // ADVANCED: MODEL & TOKENS
    document.getElementById("charModelName").value = row.modelName || "";
    document.getElementById("charTemperature").value = row.temperature ?? "";
    document.getElementById("charMaxTokensPerMessage").value = row.maxTokensPerMessage ?? "";
    document.getElementById("charTextEmbeddingModelName").value = row.textEmbeddingModelName || "";
    document.getElementById("charFitMessagesMethod").value = row.fitMessagesInContextMethod || "";
    document.getElementById("charAutoGenerateMemories").value = row.autoGenerateMemories || "";

    // ADVANCED: AVATAR & SCENE
    const avatar = row.avatar || {};
    document.getElementById("charAvatarUrl").value = avatar.url || "";
    document.getElementById("charAvatarSize").value = avatar.size ?? "";
    document.getElementById("charAvatarShape").value = avatar.shape || "";

    const scene = row.scene || {};
    const background = scene.background || {};
    const music = scene.music || {};
    document.getElementById("charSceneBackgroundUrl").value = background.url || "";
    document.getElementById("charSceneMusicUrl").value = music.url || "";

    // ADVANCED: META & FLAGS
    document.getElementById("charMetaTitle").value = row.metaTitle || "";
    document.getElementById("charMetaDescription").value = row.metaDescription || "";
    document.getElementById("charMetaImage").value = row.metaImage || "";

    const streaming = row.streamingResponse;
    document.getElementById("charStreamingResponse").value =
        streaming === false ? "false" : "true";

    document.getElementById("charFolderPath").value = row.folderPath || "";
}

