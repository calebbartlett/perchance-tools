/************************************************************
 *  SmarHamr — EDITOR.JS (Aligned + Scratch Build + Lore)
 ************************************************************/

let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";
let prettyJsonLines = [];

let charactersRows = [];
let currentCharacterIndex = 0;

/************************************************************
 *  SCRATCH BUILD — CREATE A NEW EMPTY PERCHANCE EXPORT
 ************************************************************/
function createScratchBuild() {
    const rawSkeleton =
        "{\"formatName\":\"dexie\",\"formatVersion\":1,\"data\":{\"databaseName\":\"chatbot-ui-v1\",\"databaseVersion\":90,\"tables\":[{\"name\":\"characters\",\"schema\":\"++id,modelName,fitMessagesInContextMethod,uuid,creationTime,lastMessageTime,folderPath\",\"rowCount\":1},{\"name\":\"threads\",\"schema\":\"++id,name,characterId,creationTime,lastMessageTime,lastViewTime,folderPath\",\"rowCount\":1},{\"name\":\"messages\",\"schema\":\"++id,threadId,characterId,creationTime,order\",\"rowCount\":1},{\"name\":\"misc\",\"schema\":\"key\",\"rowCount\":4},{\"name\":\"summaries\",\"schema\":\"hash,threadId\",\"rowCount\":0},{\"name\":\"memories\",\"schema\":\"++id,[summaryHash+threadId],[characterId+status],[threadId+status],[threadId+index],threadId\",\"rowCount\":0},{\"name\":\"lore\",\"schema\":\"++id,bookId,bookUrl\",\"rowCount\":0},{\"name\":\"textEmbeddingCache\",\"schema\":\"++id,textHash,&[textHash+modelName]\",\"rowCount\":0},{\"name\":\"textCompressionCache\",\"schema\":\"++id,uncompressedTextHash,&[uncompressedTextHash+modelName+tokenLimit]\",\"rowCount\":0}],\"data\":[{\"tableName\":\"characters\",\"inbound\":true,\"rows\":[{\"name\":\"Character Name\",\"roleInstruction\":\"Role Text Here\",\"maxParagraphCountPerMessage\":0,\"reminderMessage\":\"\",\"generalWritingInstructions\":\"\",\"messageWrapperStyle\":\"\",\"imagePromptPrefix\":\"\",\"imagePromptSuffix\":\"\",\"imagePromptTriggers\":\"\",\"fitMessagesInContextMethod\":\"summarizeOld\",\"autoGenerateMemories\":\"none\",\"customCode\":\"\",\"messageInputPlaceholder\":\"\",\"metaTitle\":\"\",\"metaDescription\":\"\",\"metaImage\":\"\",\"modelName\":\"perchance-ai\",\"temperature\":0.8,\"maxTokensPerMessage\":500,\"textEmbeddingModelName\":\"Xenova/bge-base-en-v1.5\",\"initialMessages\":[{\"author\":\"ai\",\"content\":\"Hello!\"}],\"shortcutButtons\":[],\"loreBookUrls\":[],\"avatar\":{\"url\":\"\",\"size\":1,\"shape\":\"square\"},\"scene\":{\"background\":{\"url\":\"\"},\"music\":{\"url\":\"\"}},\"userCharacter\":{\"avatar\":{}},\"systemCharacter\":{\"avatar\":{}},\"streamingResponse\":true,\"folderPath\":\"\",\"customData\":{},\"uuid\":null,\"creationTime\":0,\"lastMessageTime\":0,\"id\":1,\"$types\":{\"maxParagraphCountPerMessage\":\"undef\",\"initialMessages\":\"arrayNonindexKeys\",\"shortcutButtons\":\"arrayNonindexKeys\",\"loreBookUrls\":\"arrayNonindexKeys\"}}]},{\"tableName\":\"threads\",\"inbound\":true,\"rows\":[{\"name\":\"Thread Name\",\"characterId\":1,\"creationTime\":0,\"lastMessageTime\":0,\"lastViewTime\":0,\"isFav\":false,\"userCharacter\":{\"avatar\":{}},\"systemCharacter\":{\"avatar\":{}},\"character\":{\"avatar\":{}},\"modelName\":\"perchance-ai\",\"customCodeWindow\":{\"visible\":false,\"width\":null},\"customData\":{},\"folderPath\":\"\",\"loreBookId\":0,\"textEmbeddingModelName\":\"Xenova/bge-base-en-v1.5\",\"userMessagesSentHistory\":[],\"unsentMessageText\":\"\",\"shortcutButtons\":[],\"currentSummaryHashChain\":[],\"id\":1,\"$types\":{\"userMessagesSentHistory\":\"arrayNonindexKeys\",\"shortcutButtons\":\"arrayNonindexKeys\",\"currentSummaryHashChain\":\"arrayNonindexKeys\"}}]},{\"tableName\":\"messages\",\"inbound\":true,\"rows\":[{\"threadId\":1,\"message\":\"Hello!\",\"characterId\":1,\"hiddenFrom\":[],\"expectsReply\":0,\"creationTime\":0,\"variants\":[null],\"memoryIdBatchesUsed\":[],\"loreIdsUsed\":[],\"summaryHashUsed\":null,\"summariesUsed\":null,\"summariesEndingHere\":null,\"memoriesEndingHere\":null,\"memoryQueriesUsed\":[],\"messageIdsUsed\":[],\"name\":null,\"scene\":null,\"avatar\":{},\"customData\":{},\"wrapperStyle\":\"\",\"order\":0,\"instruction\":null,\"id\":1,\"$types\":{\"hiddenFrom\":\"arrayNonindexKeys\",\"expectsReply\":\"undef\",\"variants\":\"arrayNonindexKeys\",\"memoryIdBatchesUsed\":\"arrayNonindexKeys\",\"loreIdsUsed\":\"arrayNonindexKeys\",\"memoryQueriesUsed\":\"arrayNonindexKeys\",\"messageIdsUsed\":\"arrayNonindexKeys\"}}]},{\"tableName\":\"misc\",\"inbound\":true,\"rows\":[{\"key\":\"showInlineReminder\",\"value\":\"no\"},{\"key\":\"userAvatarUrl\",\"value\":\"\"},{\"key\":\"userName\",\"value\":\"User\"},{\"key\":\"userRoleInstruction\",\"value\":\"\"}]},{\"tableName\":\"summaries\",\"inbound\":true,\"rows\":[]},{\"tableName\":\"memories\",\"inbound\":true,\"rows\":[]},{\"tableName\":\"lore\",\"inbound\":true,\"rows\":[]},{\"tableName\":\"textEmbeddingCache\",\"inbound\":true,\"rows\":[]},{\"tableName\":\"textCompressionCache\",\"inbound\":true,\"rows\":[]}]} }";

    perchanceData = JSON.parse(rawSkeleton);
    rawJsonText = rawSkeleton;

    extractCharactersFromDexie();
    populateCharacterDropdown();
    loadCharacterIntoEditor(0);
    loadCharacterLoreIntoEditor();

    document.getElementById("importStatus").textContent = "Scratch build loaded.";
}

document.getElementById("scratchBuildBtn")
    .addEventListener("click", createScratchBuild);

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

        loadCharacterLoreIntoEditor();

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
            loadCharacterLoreIntoEditor();
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
        row.initialMessages[0] = { author: "ai", content: "" };
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
 *  APPLY BUTTON (GLOBAL)
 ************************************************************/
document.getElementById("applyChangesBtnTop")
    .addEventListener("click", applyChangesToCurrentCharacter);

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
 *
