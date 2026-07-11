// ============================================================
// SETUP STATE (temporary — only lives until game starts)
// ============================================================

let players = [];
let roleCounts = {};
let roleAssignments = {};
let assignmentSlots = [];
let settings = {};

// ============================================================
// SETUP SCREEN - Player Management
// ============================================================

function openPlayerEditDialog() {
    const textarea = document.getElementById("playerInput");
    textarea.value = players.join("\n");
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

    players = rawText
        .split("\n")
        .map(n => n.trim())
        .filter(n => n.length > 0);

    document.getElementById("playerCount").textContent = players.length;
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

    getRolesForAlignment("Town").forEach(role => {
        townCol.appendChild(buildRoleControl(role));
    });

    getRolesForAlignment("Mafia").forEach(role => {
        mafiaIndepCol.appendChild(buildRoleControl(role));
    });

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
        const label = document.createElement("label");
        const max = role.cap === Infinity ? 99 : role.cap;

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(max);
        input.value = "0";
        input.dataset.roleKey = role.key;
        input.style.width = "30px";
        input.addEventListener("input", updateCitizenCount);

        label.appendChild(input);
        label.appendChild(document.createTextNode(" " + getSpinnerLabel(role)));
        container.appendChild(label);
    } else {
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
    const name = role.displayName;
    if (name.endsWith("y")) return name.slice(0, -1) + "ies";
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
    const total = players.length;
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
        mafiaWakeAsGroup: document.getElementById("settingMafiaGroupWake").checked,
        serialKillerFrequency: parseInt(document.getElementById("settingSkFrequency").value, 10) || 2,
        accusationsPerLynch: parseInt(document.getElementById("settingAccusationsPerLynch").value, 10) || 3,
        lynchesPerDay: parseInt(document.getElementById("settingLynchesPerDay").value, 10) || 1,
    };
}
