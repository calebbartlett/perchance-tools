// editor.js - SmarHamr
// Complete, integrated editor logic including Profiles, Viewer, Export, Scrubber wiring, and Full World Engine.

// -----------------------------
// Globals
// -----------------------------
let perchanceData = null;
let rawJsonText = "";
let prettyJsonText = "";
let prettyJsonLines = [];
let charactersRows = [];
let currentCharacterIndex = 0;

// -----------------------------
// Helper utilities
// -----------------------------
function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}

function splitNonEmptyLines(text) {
    return text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
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

// -----------------------------
// IMPORT HANDLER
// -----------------------------
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

        // Load world into UI if present or create default
        loadWorldIntoUI();

    } catch (err) {
        console.error("Error loading export:", err);
        document.getElementById("importStatus").textContent = "Error loading file";
    }
});

// -----------------------------
// VIEWER BUTTONS
// -----------------------------
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

// -----------------------------
// DEXIE CHARACTER EXTRACTION
// -----------------------------
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

// -----------------------------
// POPULATE DROPDOWN (names only)
// -----------------------------
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

// -----------------------------
// LOAD CHARACTER INTO FULL EDITOR
// -----------------------------
function loadCharacterIntoEditor(index) {
    const row = charactersRows[index];
    if (!row) return;

    // BASIC
    const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v ?? "";
    };

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
    const avatar = row.avatar || {};
    setVal("charAvatarUrl", avatar.url || "");
    setVal("charAvatarSize", avatar.size ?? "");
    setVal("charAvatarShape", avatar.shape || "");

    const scene = row.scene || {};
    const background = scene.background || {};
    const music = scene.music || {};
    setVal("charSceneBackgroundUrl", background.url || "");
    setVal("charSceneMusicUrl", music.url || "");

    // ADVANCED: META & FLAGS
    setVal("charMetaTitle", row.metaTitle || "");
    setVal("charMetaDescription", row.metaDescription || "");
    setVal("charMetaImage", row.metaImage || "");

    const streaming = row.streamingResponse;
    const streamingEl = document.getElementById("charStreamingResponse");
    if (streamingEl) streamingEl.value = (streaming === false ? "false" : "true");

    setVal("charFolderPath", row.folderPath || "");

    const profileStatus = document.getElementById("profileStatus");
    if (profileStatus) profileStatus.textContent = `Loaded character ${index + 1}.`;
}

// -----------------------------
// APPLY CHANGES BACK INTO charactersRows
// -----------------------------
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
    if (profileStatus) profileStatus.textContent = `Changes applied to character ${currentCharacterIndex + 1}.`;
}

// -----------------------------
// DOWNLOAD EXPORT (.json.gz) with YYYYMMDDhhmm timestamp and clean filename
// -----------------------------
function downloadUpdatedExport() {
    if (!perchanceData) {
        alert("No export loaded.");
        return;
    }

    try {
        // Create timestamp YYYYMMDDhhmm
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        // Store timestamp in JSON
        if (!perchanceData.meta) perchanceData.meta = {};
        perchanceData.meta.exportTimestamp = timestamp;

        // Filename without "updated_"
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

// -----------------------------
// TOP BAR BUTTONS
// -----------------------------
const applyBtnTop = document.getElementById("applyChangesBtnTop");
if (applyBtnTop) {
    applyBtnTop.addEventListener("click", () => {
        applyChangesToCurrentCharacter();
    });
}

const downloadBtnTop = document.getElementById("downloadUpdatedBtnTop");
if (downloadBtnTop) {
    downloadBtnTop.addEventListener("click", () => {
        downloadUpdatedExport();
    });
}

// SCRUB BUTTON (top bar) - triggers the process button in Export Tools
const scrubBtnTop = document.getElementById("scrubBtnTop");
if (scrubBtnTop) {
    scrubBtnTop.addEventListener("click", () => {
        const btn = document.getElementById("processBtn");
        if (btn) btn.click();
    });
}

// -----------------------------
// WORLD ENGINE
// -----------------------------

function ensureWorldObject() {
    if (!perchanceData) return;

    if (!perchanceData.world) {
        perchanceData.world = {
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
            history: []
        };
    }

    if (!perchanceData.world.state) {
        perchanceData.world.state = {
            stability: 0.5,
            tension: 0.5,
            mystery: 0.5,
            techLevel: 0.5,
            magicLevel: 0.5,
            socialCohesion: 0.5,
            environmentalHealth: 0.5,
            narrativeMomentum: 0.5
        };
    }

    if (!perchanceData.world.rules) {
        perchanceData.world.rules = { growth: [], influence: [], feedback: [] };
    } else {
        if (!Array.isArray(perchanceData.world.rules.growth)) perchanceData.world.rules.growth = [];
        if (!Array.isArray(perchanceData.world.rules.influence)) perchanceData.world.rules.influence = [];
        if (!Array.isArray(perchanceData.world.rules.feedback)) perchanceData.world.rules.feedback = [];
    }

    if (!Array.isArray(perchanceData.world.history)) {
        perchanceData.world.history = [];
    }
}

function setSlider(sliderId, labelId, value) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.value = value;
    label.textContent = parseFloat(value).toFixed(2);

    // Remove previous listener by cloning node (simple way to avoid duplicate listeners)
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);

    newSlider.addEventListener("input", () => {
        label.textContent = parseFloat(newSlider.value).toFixed(2);
        saveWorldStateFromUI();
        updateWorldSummary();
    });
}

function loadWorldIntoUI() {
    if (!perchanceData) return;
    ensureWorldObject();

    const s = perchanceData.world.state;

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

    if (growthEl) growthEl.value = perchanceData.world.rules.growth.join("\n");
    if (influenceEl) influenceEl.value = perchanceData.world.rules.influence.join("\n");
    if (feedbackEl) feedbackEl.value = perchanceData.world.rules.feedback.join("\n");
    if (historyEl) historyEl.value = perchanceData.world.history.join("\n");

    updateWorldSummary();
}

function saveWorldStateFromUI() {
    if (!perchanceData || !perchanceData.world || !perchanceData.world.state) return;

    const s = perchanceData.world.state;

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) : 0.5;
    };

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
    if (!perchanceData || !perchanceData.world || !perchanceData.world.state) return;

    const s = perchanceData.world.state;
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

// WORLD REFLECTION ENGINE (simple, rule-aware but not executing arbitrary code)
function reflectWorld() {
    if (!perchanceData || !perchanceData.world) return;
    ensureWorldObject();

    const s = perchanceData.world.state;
    const history = perchanceData.world.history;

    const timestamp = getSimpleTimestamp();

    const reflectionNotes = [];

    // Built-in reflection logic (safe, deterministic)
    if (s.tension > 0.7 && s.socialCohesion < 0.4) {
        s.stability = clamp01(s.stability - 0.05);
        reflectionNotes.push("High tension and low social cohesion → stability decreased slightly.");
    }

    if (s.techLevel > 0.8) {
        s.mystery = clamp01(s.mystery - 0.05);
        reflectionNotes.push("High tech level → mystery decreased slightly.");
    }

    if (s.magicLevel > 0.8 && s.techLevel < 0.3) {
        s.mystery = clamp01(s.mystery + 0.05);
        reflectionNotes.push("High magic and low tech → mystery increased slightly.");
    }

    // Append history entry
    if (reflectionNotes.length > 0) {
        history.push(`${timestamp}: World reflection → ${reflectionNotes.join(" ")}`);
    } else {
        history.push(`${timestamp}: World reflection → no significant changes.`);
    }

    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = history.join("\n");

    saveWorldStateFromUI();
    updateWorldSummary();
}

function resetWorldState() {
    if (!perchanceData) return;
    ensureWorldObject();

    perchanceData.world.state = {
        stability: 0.5,
        tension: 0.5,
        mystery: 0.5,
        techLevel: 0.5,
        magicLevel: 0.5,
        socialCohesion: 0.5,
        environmentalHealth: 0.5,
        narrativeMomentum: 0.5
    };

    loadWorldIntoUI();

    const timestamp = getSimpleTimestamp();
    perchanceData.world.history.push(`${timestamp}: World state reset to neutral.`);
    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = perchanceData.world.history.join("\n");
}

// RULES APPLY (store them; execution model can be expanded later)
function applyWorldRulesFromUI() {
    if (!perchanceData) return;
    ensureWorldObject();

    const growthText = document.getElementById("worldGrowthRules") ? document.getElementById("worldGrowthRules").value : "";
    const influenceText = document.getElementById("worldInfluenceRules") ? document.getElementById("worldInfluenceRules").value : "";
    const feedbackText = document.getElementById("worldFeedbackRules") ? document.getElementById("worldFeedbackRules").value : "";

    perchanceData.world.rules.growth = splitNonEmptyLines(growthText);
    perchanceData.world.rules.influence = splitNonEmptyLines(influenceText);
    perchanceData.world.rules.feedback = splitNonEmptyLines(feedbackText);

    const timestamp = getSimpleTimestamp();
    perchanceData.world.history.push(`${timestamp}: World rules updated.`);
    const historyEl = document.getElementById("worldHistory");
    if (historyEl) historyEl.value = perchanceData.world.history.join("\n");
}

// -----------------------------
// WORLD UI Wiring (DOMContentLoaded)
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Advanced toggle
    const advToggle = document.getElementById("worldAdvancedToggle");
    const advPanel = document.getElementById("worldAdvancedPanel");
    if (advToggle && advPanel) {
        advToggle.addEventListener("change", () => {
            advPanel.style.display = advToggle.checked ? "block" : "none";
        });
    }

    // Buttons
    const reflectBtn = document.getElementById("worldReflectBtn");
    const resetBtn = document.getElementById("worldResetBtn");
    const applyRulesBtn = document.getElementById("worldApplyRulesBtn");

    if (reflectBtn) {
        reflectBtn.addEventListener("click", () => {
            saveWorldStateFromUI();
            reflectWorld();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            resetWorldState();
        });
    }

    if (applyRulesBtn) {
        applyRulesBtn.addEventListener("click", () => {
            applyWorldRulesFromUI();
        });
    }
});

// -----------------------------
// Export Tools wiring (Process button placeholder)
// -----------------------------
// The scrubber.js file is expected to define the actual processing logic.
// Here we only wire the UI status element to be updated by scrubber.js if it uses it.
const processBtn = document.getElementById("processBtn");
if (processBtn) {
    processBtn.addEventListener("click", async () => {
        // If scrubber.js exposes a global function processPerchanceExport, call it.
        // Otherwise, update status to indicate the button was pressed.
        try {
            if (typeof window.processPerchanceExport === "function") {
                document.getElementById("status").textContent = "Processing...";
                await window.processPerchanceExport(perchanceData);
                document.getElementById("status").textContent = "Processing complete.";
            } else {
                document.getElementById("status").textContent = "Scrub triggered (no scrubber implementation found).";
            }
        } catch (err) {
            console.error("Error during scrub process:", err);
            document.getElementById("status").textContent = "Error during processing.";
        }
    });
}

// -----------------------------
// End of file
// -----------------------------
