// ======================================================
//  SMARHAMR STUDIO — COMPLETE EDITOR.JS (CORRECTED)
// ======================================================

// Global export object
let currentExport = null;

// Characters array
let characters = [];

// Memories array
let memoryTable = [];

// ======================================================
//  TAB SWITCHING
// ======================================================
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.style.display = panel.id === target ? "block" : "none";
    });
  });
});

// ======================================================
//  LOAD EXPORT (.json or .json.gz)
// ======================================================
document.getElementById("loadExportBtn")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  try {
    currentExport = JSON.parse(text);
  } catch (err) {
    alert("Invalid JSON export.");
    return;
  }

  extractCharactersFromDexie();
  extractMemoriesFromDexie();
  initMemoryTab();

  alert("Export loaded.");
});

// ======================================================
//  SAVE EXPORT
// ======================================================
document.getElementById("saveExportBtn")?.addEventListener("click", () => {
  if (!currentExport) {
    alert("No export loaded.");
    return;
  }

  const blob = new Blob([JSON.stringify(currentExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "perchance-export.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ======================================================
//  CHARACTERS EXTRACTION (robust)
// ======================================================
function extractCharactersFromDexie() {
  const charTable = currentExport?.data?.data?.find(t =>
    t.tableName.toLowerCase() === "characters" ||
    t.tableName.toLowerCase() === "character"
  );

  characters = charTable ? charTable.rows : [];

  console.log("Characters loaded:", characters);
}

// ======================================================
//  MEMORIES EXTRACTION (robust)
// ======================================================
function extractMemoriesFromDexie() {
  const memTable = currentExport?.data?.data?.find(t =>
    t.tableName.toLowerCase() === "memories" ||
    t.tableName.toLowerCase() === "memory"
  );

  memoryTable = memTable ? memTable.rows : [];

  console.log("Memories loaded:", memoryTable);
}

// ======================================================
//  POPULATE CHARACTER DROPDOWN
// ======================================================
function populateMemoryCharacterDropdown() {
  const sel = document.getElementById("memoryCharacterSelect");
  if (!sel) {
    console.error("Dropdown element missing in HTML.");
    return;
  }

  sel.innerHTML = "";

  if (characters.length === 0) {
    sel.innerHTML = "<option>No characters found</option>";
    return;
  }

  characters.forEach(char => {
    const opt = document.createElement("option");
    opt.value = char.id;
    opt.textContent = char.name || `Character ${char.id}`;
    sel.appendChild(opt);
  });

  sel.onchange = () => loadMemoriesForCharacter(parseInt(sel.value));
}

// ======================================================
//  LOAD MEMORIES FOR SELECTED CHARACTER
// ======================================================
function loadMemoriesForCharacter(characterId) {
  const editor = document.getElementById("memoryEditor");
  const search = document.getElementById("memorySearch");

  if (!editor || !search) return;

  search.value = "";

  const mems = memoryTable.filter(m => m.characterId === characterId);
  editor.value = mems.map(m => m.text).join("\n");

  console.log(`Loaded ${mems.length} memories for character ${characterId}`);
}

// ======================================================
//  SEARCH MEMORIES
// ======================================================
document.getElementById("memorySearch")?.addEventListener("input", () => {
  const query = document.getElementById("memorySearch").value.toLowerCase();
  const editor = document.getElementById("memoryEditor");
  if (!editor) return;

  const lines = editor.value.split("\n");
  const filtered = lines.filter(line => line.toLowerCase().includes(query));
  editor.value = filtered.join("\n");
});

// ======================================================
//  ADD NEW MEMORY
// ======================================================
document.getElementById("addMemoryBtn")?.addEventListener("click", () => {
  const newTextEl = document.getElementById("newMemoryText");
  const editor = document.getElementById("memoryEditor");
  const sel = document.getElementById("memoryCharacterSelect");

  if (!newTextEl || !editor || !sel) return;

  const newText = newTextEl.value.trim();
  if (!newText) return;

  const charId = parseInt(sel.value);

  const nextId = memoryTable.length ? Math.max(...memoryTable.map(m => m.id)) + 1 : 0;

  memoryTable.push({
    id: nextId,
    characterId: charId,
    text: newText,
    timestamp: Date.now()
  });

  editor.value += (editor.value ? "\n" : "") + newText;
  newTextEl.value = "";
});

// ======================================================
//  SAVE ALL CHANGES
// ======================================================
document.getElementById("saveMemoryBtn")?.addEventListener("click", () => {
  const sel = document.getElementById("memoryCharacterSelect");
  const editor = document.getElementById("memoryEditor");

  if (!sel || !editor) return;

  const charId = parseInt(sel.value);
  const editorLines = editor.value.split("\n").map(l => l.trim()).filter(l => l);

  memoryTable = memoryTable.filter(m => m.characterId !== charId);

  let nextId = memoryTable.length ? Math.max(...memoryTable.map(m => m.id)) + 1 : 0;

  editorLines.forEach(line => {
    memoryTable.push({
      id: nextId++,
      characterId: charId,
      text: line,
      timestamp: Date.now()
    });
  });

  const memTable = currentExport.data.data.find(t =>
    t.tableName.toLowerCase() === "memories" ||
    t.tableName.toLowerCase() === "memory"
  );

  if (memTable) {
    memTable.rows = memoryTable;
  } else {
    currentExport.data.data.push({
      tableName: "memories",
      rows: memoryTable
    });
  }

  alert("Memories saved.");
});

// ======================================================
//  INITIALIZE MEMORY TAB
// ======================================================
function initMemoryTab() {
  if (!currentExport) {
    console.warn("No export loaded — memory tab cannot initialize.");
    return;
  }

  extractCharactersFromDexie();
  extractMemoriesFromDexie();
  populateMemoryCharacterDropdown();

  if (characters.length > 0) {
    loadMemoriesForCharacter(characters[0].id);
  }
}

// ======================================================
//  INITIAL PAGE LOAD
// ======================================================
window.addEventListener("DOMContentLoaded", () => {
  const firstPanel = document.querySelector(".tab-panel");
  if (firstPanel) firstPanel.style.display = "block";
});
