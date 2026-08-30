// ===============================
// BASIC EDITOR.JS SKELETON
// ===============================

// Global export object (loaded from file)
let currentExport = null;

// Global characters array (from Dexie "characters" table)
let characters = [];

// Global memory table (from Dexie "memories" table)
let memoryTable = null;

// ===============================
// TAB SWITCHING
// ===============================
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.style.display = panel.id === target ? "block" : "none";
    });
  });
});

// ===============================
// LOAD EXPORT (.json.gz or .json)
// ===============================
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
  initMemoryTab();
  alert("Export loaded.");
});

// ===============================
// SAVE EXPORT
// ===============================
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

// ===============================
// CHARACTERS EXTRACTION
// ===============================
function extractCharactersFromDexie() {
  const charTable = currentExport.data.data.find(t => t.tableName === "characters");
  characters = charTable ? charTable.rows : [];
}

// ===============================
// MEMORY TAB LOGIC
// ===============================

// Load memory table from Dexie export
function extractMemoriesFromDexie() {
  const mem = currentExport.data.data.find(t => t.tableName === "memories");
  memoryTable = mem ? mem.rows : [];
}

// Populate character dropdown
function populateMemoryCharacterDropdown() {
  const sel = document.getElementById("memoryCharacterSelect");
  if (!sel) return;

  sel.innerHTML = "";

  characters.forEach(char => {
    const opt = document.createElement("option");
    opt.value = char.id;
    opt.textContent = char.name || `Character ${char.id}`;
    sel.appendChild(opt);
  });

  sel.onchange = () => loadMemoriesForCharacter(parseInt(sel.value));
}

// Load memories for selected character
function loadMemoriesForCharacter(characterId) {
  const editor = document.getElementById("memoryEditor");
  const search = document.getElementById("memorySearch");
  if (!editor || !search) return;

  search.value = "";

  const mems = memoryTable.filter(m => m.characterId === characterId);
  editor.value = mems.map(m => m.text).join("\n");
}

// Search memories (live filter)
document.getElementById("memorySearch")?.addEventListener("input", () => {
  const query = document.getElementById("memorySearch").value.toLowerCase();
  const editor = document.getElementById("memoryEditor");
  if (!editor) return;

  const lines = editor.value.split("\n");
  const filtered = lines.filter(line => line.toLowerCase().includes(query));
  editor.value = filtered.join("\n");
});

// Add new memory
document.getElementById("addMemoryBtn")?.addEventListener("click", () => {
  const newTextEl = document.getElementById("newMemoryText");
  const editor = document.getElementById("memoryEditor");
  const sel = document.getElementById("memoryCharacterSelect");

  if (!newTextEl || !editor || !sel) return;

  const newText = newTextEl.value.trim();
  if (!newText) return;

  const charId = parseInt(sel.value);

  // Add to memory table
  const nextId = memoryTable.length ? Math.max(...memoryTable.map(m => m.id)) + 1 : 0;
  memoryTable.push({
    id: nextId,
    characterId: charId,
    text: newText,
    timestamp: Date.now()
  });

  // Append to editor
  editor.value += (editor.value ? "\n" : "") + newText;

  newTextEl.value = "";
});

// Save all changes
document.getElementById("saveMemoryBtn")?.addEventListener("click", () => {
  const sel = document.getElementById("memoryCharacterSelect");
  const editor = document.getElementById("memoryEditor");
  if (!sel || !editor) return;

  const charId = parseInt(sel.value);
  const editorLines = editor.value.split("\n").map(l => l.trim()).filter(l => l);

  // Remove old memories for this character
  memoryTable = memoryTable.filter(m => m.characterId !== charId);

  // Add rewritten memories
  let nextId = memoryTable.length ? Math.max(...memoryTable.map(m => m.id)) + 1 : 0;
  editorLines.forEach(line => {
    memoryTable.push({
      id: nextId++,
      characterId: charId,
      text: line,
      timestamp: Date.now()
    });
  });

  // Write back into export
  const memTable = currentExport.data.data.find(t => t.tableName === "memories");
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

// Initialize memory tab
function initMemoryTab() {
  if (!currentExport) return;
  extractMemoriesFromDexie();
  populateMemoryCharacterDropdown();

  if (characters.length > 0) {
    loadMemoriesForCharacter(characters[0].id);
  }
}

// ===============================
// INITIALIZATION
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  // Default: show first tab
  const firstPanel = document.querySelector(".tab-panel");
  if (firstPanel) firstPanel.style.display = "block";
});
