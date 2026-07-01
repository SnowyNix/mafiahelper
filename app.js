// ============================================================
// STATE
// ============================================================
const appState = {
    players: [],
    roleCounts: {},      // { roleKey: count }
    roleAssignments: {}, // { slotId: playerId }
};

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(screenId) {
    document.querySelectorAll("div[id^='screen']").forEach(s => s.style.display = "none");
    const target = document.getElementById(screenId);
    if (target) target.style.display = "block";
}

// ============================================================
// SETUP SCREEN - Player Management
// ============================================================
function openPlayerEditDialog() {
    const textarea = document.getElementById("playerInput");
    textarea.value = appState.players.join("\n");
    document.getElementById("playerEditDialog").style.display = "block";
    document.getElementById("playerEditOverlay").style.display = "block";
}

function closePlayerEditDialog() {
    document.getElementById("playerEditDialog").style.display = "none";
    document.getElementById("playerEditOverlay").style.display = "none";
}

function savePlayersFromDialog() {
    const rawText = document.getElementById("playerInput").value.trim();
    if (!rawText) {
        alert("Please enter at least one player name!");
        return;
    }
    
    appState.players = rawText
        .split("\n")
        .map(n => n.trim())
        .filter(n => n.length > 0);
    
    document.getElementById("playerCount").textContent = appState.players.length;
    updateCitizenCount();
    closePlayerEditDialog();
}

// ============================================================
// SETUP SCREEN - Role Selection UI
// ============================================================
function buildRoleSelectUI() {
    const townCol = document.getElementById("townRolesColumn");
    const mafiaIndepCol = document.getElementById("mafiaIndepColumn");
    
    townCol.innerHTML = "<strong>TOWN</strong><br>";
    mafiaIndepCol.innerHTML = "<strong>MAFIA</strong><br>";
    
    // Town roles
    getRolesForAlignment("Town").forEach(role => {
        townCol.appendChild(buildRoleControl(role));
    });
    
    // Mafia roles
    getRolesForAlignment("Mafia").forEach(role => {
        mafiaIndepCol.appendChild(buildRoleControl(role));
    });
    
    // Independent roles
    const indepLabel = document.createElement("div");
    indepLabel.innerHTML = "<br><strong>INDEPENDENTS</strong><br>";
    mafiaIndepCol.appendChild(indepLabel);
    getRolesForAlignment("Independent").forEach(role => {
        mafiaIndepCol.appendChild(buildRoleControl(role));
    });
}

function getRolesForAlignment(alignment) {
    return Object.entries(ROLES)
        .filter(([key, role]) => role.alignment === alignment && key !== "roleCitizen")
        .map(([key, role]) => ({ key, ...role }));
}

function buildRoleControl(role) {
    const container = document.createElement("div");
    container.style.marginBottom = "8px";
    
    const isMultiCap = role.cap !== 1;
    
    if (isMultiCap) {
        // Spinner
        const label = document.createElement("label");
        const max = role.cap === Infinity ? 99 : role.cap;
        label.textContent = getSpinnerLabel(role) + ": ";
        
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(max);
        input.value = "0";
        input.dataset.roleKey = role.key;
        input.style.width = "50px";
        input.addEventListener("input", updateCitizenCount);
        
        label.appendChild(input);
        container.appendChild(label);
    } else {
        // Checkbox
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.dataset.roleKey = role.key;
        input.addEventListener("change", updateCitizenCount);
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(" " + role.displayName));
        container.appendChild(label);
    }
    
    return container;
}

function getSpinnerLabel(role) {
    // Pluralize sensibly
    const name = role.displayName;
    if (name.endsWith("y")) return name.slice(0, -1) + "ies";
    if (name.endsWith("n")) return name + "s";
    return name + "s";
}

function readRoleCountsFromUI() {
    const counts = {};
    document.querySelectorAll("#screenSetup [data-role-key]").forEach(el => {
        const key = el.dataset.roleKey;
        const value = el.type === "checkbox" 
            ? (el.checked ? 1 : 0)
            : Math.max(0, parseInt(el.value, 10) || 0);
        counts[key] = value;
    });
    return counts;
}

function totalAssignedRoles(counts) {
    return Object.values(counts).reduce((sum, val) => sum + val, 0);
}

function updateCitizenCount() {
    const counts = readRoleCountsFromUI();
    const total = appState.players.length;
    const assigned = totalAssignedRoles(counts);
    const citizens = total - assigned;
    
    document.getElementById("citizenCount").textContent = Math.max(0, citizens);
    
    const warning = document.getElementById("citizenCountWarning");
    if (citizens < 0) {
        warning.style.display = "inline";
        warning.textContent = " (too many roles assigned!)";
        warning.style.color = "red";
    } else {
        warning.style.display = "none";
    }
}

// ============================================================
// SETUP SCREEN - Additional Settings
// ============================================================
function readSettingsFromUI() {
    return {
        randomAssign: document.getElementById("settingRandomAssign").checked,
        mafiaWakeAsGroup: document.getElementById("settingMafiaGroupWake").checked,
        serialKillerFrequency: parseInt(document.getElementById("settingSkFrequency").value, 10) || 2,
    };
}

// ============================================================
// SETUP -> WHO'S WHO TRANSITION
// ============================================================
function continueToWhosWho() {
    if (appState.players.length === 0) {
        alert("Please add at least one player.");
        return;
    }
    
    const counts = readRoleCountsFromUI();
    const total = appState.players.length;
    const assigned = totalAssignedRoles(counts);
    
    if (assigned > total) {
        alert("You have assigned more roles than there are players.");
        return;
    }
    
    // Save role counts and settings
    appState.roleCounts = counts;
    appState.settings = readSettingsFromUI();
    
    // Build assignment slots from role counts
    buildAssignmentSlots();
    
    renderWhosWhoScreen();
    showScreen("screenWhosWho");
}

function buildAssignmentSlots() {
    const slots = [];
    
    for (const [roleKey, count] of Object.entries(appState.roleCounts)) {
        if (count < 1) continue;
        const role = ROLES[roleKey];
        
        for (let i = 0; i < count; i++) {
            const isNumbered = role.cap !== 1;
            const slotId = `${roleKey}_${i}`;
            const displayName = isNumbered 
                ? `${role.displayName} #${i + 1}`
                : role.displayName;
            
            slots.push({
                slotId,
                roleKey,
                displayName,
                assignedPlayerId: null,
            });
        }
    }
    
    appState.assignmentSlots = slots;
    appState.roleAssignments = {};
}

// ============================================================
// WHO'S WHO SCREEN
// ============================================================
function renderWhosWhoScreen() {
    const container = document.getElementById("roleAssignmentList");
    container.innerHTML = "";
    
    if (appState.assignmentSlots.length === 0) {
        container.innerHTML = "<p>No special roles selected — everyone will be a Citizen.</p>";
        updateCitizenPreview();
        return;
    }
    
    appState.assignmentSlots.forEach(slot => {
        const row = document.createElement("div");
        row.style.marginBottom = "8px";
        
        const label = document.createElement("label");
        label.textContent = slot.displayName + ": ";
        
        const select = document.createElement("select");
        select.dataset.slotId = slot.slotId;
        
        // Empty option
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "-- unassigned --";
        select.appendChild(emptyOpt);
        
        // Player options
        const available = getAvailablePlayers(slot.slotId);
        available.forEach(player => {
            const opt = document.createElement("option");
            opt.value = player;
            opt.textContent = player;
            if (appState.roleAssignments[slot.slotId] === player) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        // If already assigned, ensure that player is in the list
        if (appState.roleAssignments[slot.slotId]) {
            const assigned = appState.roleAssignments[slot.slotId];
            if (!available.includes(assigned)) {
                const opt = document.createElement("option");
                opt.value = assigned;
                opt.textContent = assigned;
                opt.selected = true;
                select.insertBefore(opt, select.firstChild.nextSibling);
            }
        }
        
        select.addEventListener("change", (e) => {
            if (e.target.value) {
                appState.roleAssignments[slot.slotId] = e.target.value;
            } else {
                delete appState.roleAssignments[slot.slotId];
            }
            renderWhosWhoScreen();
        });
        
        label.appendChild(select);
        row.appendChild(label);
        container.appendChild(row);
    });
    
    updateCitizenPreview();
}

function getAvailablePlayers(excludeSlotId) {
    const assigned = new Set();
    
    // Collect all assigned players except this slot
    for (const [slotId, playerName] of Object.entries(appState.roleAssignments)) {
        if (slotId !== excludeSlotId) {
            assigned.add(playerName);
        }
    }
    
    // Return unassigned players
    return appState.players.filter(p => !assigned.has(p));
}

function updateCitizenPreview() {
    const assigned = new Set(Object.values(appState.roleAssignments));
    const unassigned = appState.players.filter(p => !assigned.has(p));
    
    const preview = document.getElementById("citizenPreview");
    if (unassigned.length === 0) {
        preview.textContent = "All players have special roles assigned.";
    } else {
        preview.textContent = `Citizens (${unassigned.length}): ${unassigned.join(", ")}`;
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    try {
        buildRoleSelectUI();
        showScreen("screenSetup");
    } catch (e) {
        console.error("Init error:", e);
        alert("Error loading app: " + e.message);
    }
});

console.log("app.js loaded");
