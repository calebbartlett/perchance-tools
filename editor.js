/************************************************************
 *  SMARHAMR — EDITOR.JS (FULL, CORRECTED)
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

// Canonical lore entry title
const WORLD_LORE_TITLE = "WorldEngine by SmarHamr";

// Canonical tags
const WORLD_TAG_START = "<SmarHamrWorldEngineSTART>";
const WORLD_TAG_END   = "<SmarHamrWorldEngineEND>";

// In-memory world object (never stored in JSON)
let worldObj = null;

/************************************************************
 *  DEFAULT WORLD OBJECT
 ************************************************************/
function defaultWorldObject() {
    return {
        state: {
            stability: 0.5,
            tension: 0.5,
            mystery: 0.5,
            techLevel: 0.5,
            magicLevel: 0.5,
            socialCohesion: 0.5,
            environmentalHealth: 0.5,
            narrativeMomentum: 0.5
        },
        rules: {
            growth: [],
            influence: [],
            feedback: []
        },
        history: [],
        url: "(none)"   // URL signature placeholder
    };
}

/************************************************************
 *  GENERATE WORLD ENGINE TEXT BLOCK (compact + ALL CAPS)
 ************************************************************/
function generateWorldEngineText(world) {
    const lines = [];

    lines.push(WORLD_TAG_START);

    // STATE
    lines.push("STATE:");
    lines.push(`stability: ${world.state.stability.toFixed(2)}`);
    lines.push(`tension: ${world.state.tension.toFixed(2)}`);
    lines.push(`mystery: ${world.state.mystery.toFixed(2)}`);
    lines.push(`techLevel: ${world.state.techLevel.toFixed(2)}`);
    lines.push(`magicLevel: ${world.state.magicLevel.toFixed(2)}`);
    lines.push(`socialCohesion: ${world.state.socialCohesion.toFixed(2)}`);
    lines.push(`environmentalHealth: ${world.state.environmentalHealth.toFixed(2)}`);
    lines.push(`narrativeMomentum: ${world.state.narrativeMomentum.toFixed(2)}`);

    // RULES
    lines.push("RULES:");

    lines.push("GROWTH:");
    world.rules.growth.forEach(rule => lines.push(`- ${rule}`));

    lines.push("INFLUENCE:");
    world.rules.influence.forEach(rule => lines.push(`- ${rule}`));

    lines.push("FEEDBACK:");
    world.rules.feedback.forEach(rule => lines.push(`- ${rule}`));

    // HISTORY
    lines.push("HISTORY:");
    world.history.forEach(entry => lines.push(`- ${entry}`));

    // URL signature
    lines.push("URL:");
    lines.push(world.url || "(none)");

    lines.push(WORLD_TAG_END);

    return lines.join("\n");
}

/************************************************************
 *  PARSE WORLD ENGINE TEXT BLOCK
 ************************************************************/
function parseWorldEngineText(text) {
    const world = defaultWorldObject();

    if (!text || typeof text !== "string") {
        return world;
    }

    const startIndex = text.indexOf(WORLD_TAG_START);
    const endIndex   = text.indexOf(WORLD_TAG_END);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return world;
    }

    const block = text.substring(
        startIndex + WORLD_TAG_START.length,
        endIndex
    ).trim();

    const lines = block.split("\n").map(l => l.trim());

    let section = null;
    let ruleSection = null;

    for (const line of lines) {
        if (line === "STATE:") {
            section = "STATE";
            continue;
        }
        if (line === "RULES:") {
            section = "RULES";
            continue;
        }
        if (line === "GROWTH:") {
            section = "RULES";
            ruleSection = "growth";
            continue;
        }
        if (line === "INFLUENCE:") {
            section = "RULES";
            ruleSection = "influence";
            continue;
        }
        if (line === "FEEDBACK:") {
            section = "RULES";
            ruleSection = "feedback";
            continue;
        }
        if (line === "HISTORY:") {
            section = "HISTORY";
            continue;
        }
        if (line === "URL:") {
            section = "URL";
            continue;
        }

        if (section === "STATE") {
            const [key, val] = line.split(":").map(s => s.trim());
            if (key && val && !isNaN(parseFloat(val))) {
                world.state[key] = parseFloat(val);
            }
        } else if (section === "RULES" && ruleSection) {
            if (line.startsWith("- ")) {
                const rule = line.substring(2).trim();
                world.rules[ruleSection].push(rule);
            }
        } else if (section === "HISTORY") {
            if (line.startsWith("- ")) {
                const entry = line.substring(2).trim();
                world.history.push(entry);
            }
        } else if (section === "URL") {
            if (line.length > 0) {
                world.url = line;
            }
        }
    }

    return world;
}

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

        loadWorldFromLore();
        loadWorldIntoUI();

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
    setVal("charTemperature", row.temperature ?? "");
    setVal("charMaxTokensPerMessage", row.maxTokensPerMessage ?? "");
    setVal("charTextEmbeddingModelName", row.textEmbeddingModelName || "");
    setVal("charFitMessagesMethod", row.fitMessagesInContextMethod || "");
    setVal("charAutoGenerateMemories", row.autoGenerateMemories || "");

    // ADVANCED: AVATAR & SCENE
    if (!row.avatar) row.avatar = {};
    setVal("charAvatarUrl", row.avatar.url || "");
    setVal("charAvatarSize", row.avatar.size ?? "");
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
    if (avatarSizeVal !== "") row.avatar.size = parseInt(avatarSizeVal, 10);
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
const scrubBtnTop = document.getElementById("scrubBtnTop");

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
        return;
    }

    const { row } = findWorldLoreRow();
    if (!row) {
        return;
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

    // Ensure history is clean strings
    if (!worldObj) worldObj = defaultWorldObject();
    worldObj.history = (worldObj.history || []).filter(h => typeof h === "string");

    const { row, table } = findWorldLoreRow();
    const serialized = generateWorldEngineText(worldObj);

    if (row) {
        if ("content" in row) row.content = serialized;
        else if ("body" in row) row.body = serialized;
        else if ("text" in row) row.text = serialized;
        else row.content = serialized;
    } else {
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
        saveWorldToLore();

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
if (downloadBtnTop) {
    downloadBtnTop.addEventListener("click", () => {
        downloadUpdatedExport();
    });
}

if (scrubBtnTop) {
    scrubBtnTop.addEventListener("click", () => {
        const btn = document.getElementById("processBtn");
        if (btn) btn.click();
    });
}

/************************************************************
 *  WORLD ENGINE — UI WIRING + REFLECTION + RULES + HISTORY
 ************************************************************/
function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

function setSlider(sliderId, labelId, value) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.value = value;
    label.textContent = parseFloat(value).toFixed(2);

    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);

    newSlider.addEventListener("input", () => {
        label.textContent = parseFloat(newSlider.value).toFixed(2);
        saveWorldStateFromUI();
        updateWorldSummary();
    });
}

function loadWorldIntoUI() {
    if (!worldObj) loadWorldFromLore();
    if (!worldObj) worldObj = defaultWorldObject();

    const s = worldObj.state;

    setSlider("worldStability", "worldStabilityVal", s.stability);
    setSlider("worldTension", "worldTensionVal", s.tension);
    setSlider("worldMystery", "worldMysteryVal", s.mystery);
    setSlider("worldTechLevel", "worldTechLevelVal", s.techLevel);
    setSlider("worldMagicLevel", "worldMagicLevelVal", s.magicLevel);
    setSlider("worldSocialCohesion", "worldSocialCohesionVal", s.socialCohesion);
    setSlider("worldEnvironmentalHealth", "worldEnvironmentalHealthVal", s.environmentalHealth);
    setSlider("worldNarrativeMomentum", "worldNarrativeMomentumVal", s.narrativeMomentum);

    const growthEl = document.getElementById("worldGrowthRules");
    const influenceEl = document.getElementById("worldInfluenceRules");
    const feedbackEl = document.getElementById("worldFeedbackRules");
    const historyEl = document.getElementById("worldHistory");

    if (growthEl) growthEl.value = (worldObj.rules.growth || []).join("\n");
    if (influenceEl) influenceEl.value = (worldObj.rules.influence || []).join("\n");
    if (feedbackEl) feedbackEl.value = (worldObj.rules.feedback || []).join("\n");
    if (historyEl) historyEl.value = (worldObj.history || []).join("\n");

    updateWorldSummary();
}

function saveWorldStateFromUI() {
    if (!worldObj) worldObj = defaultWorldObject();

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) : 0.5;
    };

    const s = worldObj.state;

    s.stability = clamp01(getVal("worldStability"));
    s.tension = clamp01(getVal("worldTension"));
    s.mystery = clamp01(getVal("worldMystery"));
    s.techLevel = clamp01(getVal("worldTechLevel"));
    s.magicLevel = clamp01(getVal("worldMagicLevel"));
    s.socialCohesion = clamp01(getVal("worldSocialCohesion"));
    s.environmentalHealth = clamp01(getVal("worldEnvironmentalHealth"));
    s.narrativeMomentum = clamp01(getVal("worldNarrativeMomentum"));
}

function describeLevel(v) {
    if (v < 0.2) return "very low";
    if (v < 0.4) return "low";
    if (v < 0.6) return "medium";
    if (v < 0.8) return "high";
    return "very high";
}

function updateWorldSummary() {
    if (!worldObj || !worldObj.state) return;

    const s = worldObj.state;
    const summaryLines = [];

    summaryLines.push(`Stability: ${s.stability.toFixed(2)} (${describeLevel(s.stability)})`);
    summaryLines.push(`Tension: ${s.tension.toFixed(2)} (${describeLevel(s.tension)})`);
    summaryLines.push(`Mystery: ${s.mystery.toFixed(2)} (${describeLevel(s.mystery)})`);
    summaryLines.push(`Tech Level: ${s.techLevel.toFixed(2)} (${describeLevel(s.techLevel)})`);
    summaryLines.push(`Magic Level: ${s.magicLevel.toFixed(2)} (${describeLevel(s.magicLevel)})`);
    summaryLines.push(`Social Cohesion: ${s.socialCohesion.toFixed(2)} (${describeLevel(s.socialCohesion)})`);
    summaryLines.push(`Environmental Health: ${s.environmentalHealth.toFixed(2)} (${describeLevel(s.environmentalHealth)})`);
    summaryLines.push(`Narrative Momentum: ${s.narrativeMomentum.toFixed(2)} (${describeLevel(s.narrativeMomentum)})`);

    const el = document.getElementById("worldSummary");
    if (el) el.textContent = summaryLines.join(" | ");
}

function getSimpleTimestamp() {
    const now = new Date();
    return (
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0")
    );
}

function reflectWorld() {
    if (!worldObj) worldObj = defaultWorldObject();

    const s = worldObj.state;
    const history = worldObj.history;

    const timestamp = getSimpleTimestamp();
    const notes = [];

    if (s.tension > 0.7 && s.socialCohesion < 0.4) {
        s.stability = clamp01(s.stability - 0.05);
        notes.push("High tension + low cohesion → stability decreased.");
    }

    if (s.techLevel > 0.8) {
        s.mystery = clamp01(s.mystery - 0.05);
        notes.push("High tech → mystery decreased.");
    }

    if (s.magicLevel > 0.8 && s.techLevel < 0.3) {
        s.mystery = clamp01(s.mystery + 0.05);
        notes.push("High magic + low tech → mystery increased.");
    }

    if (notes.length > 0) {
        history.push(`${timestamp}: world reflection → ${notes.join(" ")}`);
    } else {
        history.push(`${timestamp}: world reflection → no significant changes.`);
    }

    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = history.join("\n");

    saveWorldToLore();
    updateWorldSummary();
}

function resetWorldState() {
    worldObj = defaultWorldObject();

    loadWorldIntoUI();

    const timestamp = getSimpleTimestamp();
    worldObj.history.push(`${timestamp}: world state reset to neutral.`);

    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = worldObj.history.join("\n");

    saveWorldToLore();
}

function applyWorldRulesFromUI() {
    if (!worldObj) worldObj = defaultWorldObject();

    const growthText = document.getElementById("worldGrowthRules")?.value || "";
    const influenceText = document.getElementById("worldInfluenceRules")?.value || "";
    const feedbackText = document.getElementById("worldFeedbackRules")?.value || "";

    worldObj.rules.growth = growthText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    worldObj.rules.influence = influenceText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    worldObj.rules.feedback = feedbackText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const timestamp = getSimpleTimestamp();
    worldObj.history.push(`${timestamp}: world rules updated.`);

    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = worldObj.history.join("\n");

    saveWorldToLore();
}

/************************************************************
 *  WORLD TAB BUTTON WIRING
 ************************************************************/
document.addEventListener("DOMContentLoaded", () => {
    const reflectBtn = document.getElementById("worldReflectBtn");
    if (reflectBtn) {
        reflectBtn.addEventListener("click", () => {
            reflectWorld();
        });
    }

    const resetBtn = document.getElementById("worldResetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            resetWorldState();
        });
    }

    const applyRulesBtn = document.getElementById("worldApplyRulesBtn");
    if (applyRulesBtn) {
        applyRulesBtn.addEventListener("click", () => {
            applyWorldRulesFromUI();
        });
    }

    const advToggle = document.getElementById("worldAdvancedToggle");
    const advPanel = document.getElementById("worldAdvancedPanel");
    if (advToggle && advPanel) {
        advToggle.addEventListener("change", () => {
            advPanel.style.display = advToggle.checked ? "block" : "none";
        });
    }
});

/************************************************************
 *  TAB SWITCHING — ENSURE WORLD UI LOADS
 ************************************************************/
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;

            if (tab === "world") {
                loadWorldFromLore();
                loadWorldIntoUI();
            }
        });
    });
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

            document.getElementById("origSize").textContent = result.originalSize;
            document.getElementById("cleanSize").textContent = result.cleanedSize;
            document.getElementById("reduction").textContent = result.reductionPercent + "%";
            document.getElementById("savedImagesCount").textContent = result.savedImagesRemoved;
            document.getElementById("imageTagCount").textContent = result.imageTagsRemoved;

            document.getElementById("jsonViewer").textContent = result.cleanedJson;

            perchanceData = JSON.parse(result.cleanedJson);
            rawJsonText = result.cleanedJson;

            extractCharactersFromDexie();
            populateCharacterDropdown();

            if (charactersRows.length > 0) {
                loadCharacterIntoEditor(0);
            }

            loadWorldFromLore();
            loadWorldIntoUI();

            document.getElementById("status").textContent = "Scrub complete.";
        } catch (err) {
            console.error("Scrub error:", err);
            alert("Scrub failed.");
        }
    });
}

/************************************************************
 *  SAFETY CHECKS — ENSURE WORLD ENGINE ALWAYS EXISTS
 ************************************************************/
function ensureWorldEngineExists() {
    const { row } = findWorldLoreRow();
    if (!row) {
        worldObj = defaultWorldObject();
        saveWorldToLore();
    }
}

/************************************************************
 *  INITIALIZATION AFTER IMPORT (if any)
 ************************************************************/
document.addEventListener("DOMContentLoaded", () => {
    if (perchanceData) {
        ensureWorldEngineExists();
        loadWorldFromLore();
        loadWorldIntoUI();
    }
});

/************************************************************
 *  END OF FILE
 ************************************************************/
console.log("SmarHamr editor.js fully loaded.");
