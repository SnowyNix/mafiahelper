// ============================================================
// SETUP STATE (temporary — only lives until game starts)
// ============================================================

let players = [];
let roleCounts = {};
let roleAssignments = {};
let assignmentSlots = [];
let settings = {};

// ============================================================
// I18N (future-proofing for localization)
// ============================================================

const I18N = {
    en: {
        appTitle: "Mafia Helper",
        setupTitle: "Setup",
        whosWhoTitle: "Who's Who?",
        firstNightTitle: "First Night",
        rosterTitle: "ROSTER",
        livingPlayers: "LIVING PLAYERS",
        deadPlayers: "DEAD PLAYERS",
        townAligned: "Town-aligned",
        mafiaAligned: "Mafia-aligned",
        independentAligned: "Independents",
        noFirstNightActions: "No first-night actions required.",
        terroristPlantsOn: (name) => `Terrorist (${name}) plants a bomb on`,
        blastRadius: (left, right) => `${left} and ${right} are also in the blast radius.`,
        singleBlastRadius: (name) => `${name} is also in the blast radius.`,
        skip: "Skip",
        ok: "OK",
        back: "Back",
        continue: "Continue",
        beginDay1: "Begin Day 1",
        rosterBtn: "Roster",
        bombSkipped: "Bomb planting skipped.",
        noBlastRadius: "No other players in blast radius.",
        close: "Close",
    }
};

let currentLang = 'en';

function t(key, ...args) {
    const str = I18N[currentLang]?.[key] ?? key;
    return typeof str === 'function' ? str(...args) : str;
}

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
    };
}

// ============================================================
// SETUP -> WHO'S WHO TRANSITION
// ============================================================

function continueToWhosWho() {
    if (players.length === 0) {
        alert("Please add at least one player.");
        return;
    }

    const counts = readRoleCountsFromUI();
    const total = players.length;
    const assigned = totalAssignedRoles(counts);

    if (assigned > total) {
        alert("You have assigned more roles than there are players.");
        return;
    }

    roleCounts = counts;
    settings = readSettingsFromUI();

    buildAssignmentSlots();
    renderWhosWhoScreen();
    showScreen("screenWhosWho");
}

function buildAssignmentSlots() {
    assignmentSlots = [];

    for (const [roleKey, count] of Object.entries(roleCounts)) {
        if (count < 1) continue;
        const role = ROLES[roleKey];

        for (let i = 0; i < count; i++) {
            const isNumbered = role.cap !== 1;
            const slotId = `${roleKey}_${i}`;
            const displayName = isNumbered
                ? `${role.displayName} #${i + 1}`
                : role.displayName;

            assignmentSlots.push({
                slotId,
                roleKey,
                displayName,
            });
        }
    }

    roleAssignments = {};
}

// ============================================================
// WHO'S WHO SCREEN
// ============================================================

function renderWhosWhoScreen() {
    const container = document.getElementById("roleAssignmentList");
    container.innerHTML = "";

    if (assignmentSlots.length === 0) {
        container.innerHTML = "<p>No special roles selected — everyone will be a Citizen.</p>";
        updateCitizenPreview();
        return;
    }

    assignmentSlots.forEach(slot => {
        const row = document.createElement("div");
        row.style.marginBottom = "8px";

        const label = document.createElement("label");
        label.textContent = slot.displayName + ": ";

        const select = document.createElement("select");
        select.dataset.slotId = slot.slotId;

        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "-- unassigned --";
        select.appendChild(emptyOpt);

        const available = getAvailablePlayers(slot.slotId);
        available.forEach(player => {
            const opt = document.createElement("option");
            opt.value = player;
            opt.textContent = player;
            if (roleAssignments[slot.slotId] === player) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        // Re-insert previously assigned player if needed
        const assigned = roleAssignments[slot.slotId];
        if (assigned && !available.includes(assigned)) {
            const opt = document.createElement("option");
            opt.value = assigned;
            opt.textContent = assigned;
            opt.selected = true;
            select.insertBefore(opt, select.firstChild.nextSibling);
        }

        select.addEventListener("change", (e) => {
            if (e.target.value) {
                roleAssignments[slot.slotId] = e.target.value;
            } else {
                delete roleAssignments[slot.slotId];
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
    const assigned = new Set(Object.values(roleAssignments));
    return players.filter(p => !assigned.has(p));
}

function updateCitizenPreview() {
    const assigned = new Set(Object.values(roleAssignments));
    const unassigned = players.filter(p => !assigned.has(p));

    const preview = document.getElementById("citizenPreview");
    if (unassigned.length === 0) {
        preview.textContent = "All players have special roles assigned.";
    } else {
        preview.textContent = `Citizens (${unassigned.length}): ${unassigned.join(", ")}`;
    }
}

// ============================================================
// WHO'S WHO - RANDOMIZATION
// ============================================================

function randomizeUnassigned() {
    const unassignedSlots = assignmentSlots.filter(
        slot => !roleAssignments[slot.slotId]
    );

    if (unassignedSlots.length === 0) {
        alert("All roles are already assigned!");
        return;
    }

    const assigned = new Set(Object.values(roleAssignments));
    const availablePlayers = players.filter(p => !assigned.has(p));

    if (availablePlayers.length === 0) {
        alert("No unassigned players available!");
        return;
    }

    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);

    unassignedSlots.forEach((slot, index) => {
        if (index < shuffled.length) {
            roleAssignments[slot.slotId] = shuffled[index];
        }
    });

    renderWhosWhoScreen();
}

function randomizeAll() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    roleAssignments = {};

    assignmentSlots.forEach((slot, index) => {
        if (index < shuffled.length) {
            roleAssignments[slot.slotId] = shuffled[index];
        }
    });

    renderWhosWhoScreen();
}

// ============================================================
// WHO'S WHO - CONFIRMATION + HANDOFF TO GAME
// ============================================================

function confirmRoleAssignments() {
    const unassignedSlots = assignmentSlots.filter(
        slot => !roleAssignments[slot.slotId]
    );

    if (unassignedSlots.length > 0) {
        alert(`Please assign all ${unassignedSlots.length} role(s) before continuing.`);
        return;
    }

    // Final settings read (in case user changed them)
    settings = readSettingsFromUI();

    // === HANDOFF ===
    startGame(players, roleAssignments, settings);

    showFirstNightScreen();
}

// ============================================================
// FIRST NIGHT SCREEN
// ============================================================

function showFirstNightScreen() {
    renderFirstNightActions();
    showScreen("screenFirstNight");

    // Apply localized button texts
    const backBtn = document.getElementById("firstNightBackBtn");
    if (backBtn) backBtn.textContent = t('back');

    const dayBtn = document.getElementById("firstNightDayBtn");
    if (dayBtn) dayBtn.textContent = t('beginDay1');

    // Show and localize roster button
    const rosterBtn = document.getElementById("rosterToggleBtn");
    if (rosterBtn) {
        rosterBtn.style.display = "block";
        rosterBtn.textContent = t('rosterBtn');
    }

    // Localize roster dialog title + close button
    const rosterTitleEl = document.getElementById("rosterTitle");
    if (rosterTitleEl) rosterTitleEl.textContent = t('rosterTitle');

    const rosterClose = document.getElementById("rosterCloseBtn");
    if (rosterClose) rosterClose.textContent = t('close');
}

function renderFirstNightActions() {
    const container = document.getElementById("firstNightActions");
    container.innerHTML = "";

    const terrorists = game.players.filter(p => p.roleKey === 'roleTerrorist' && p.alive);
    if (terrorists.length > 0) {
        const terrorist = terrorists[0];
        const section = document.createElement("div");
        section.style.marginBottom = "16px";

        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        const livingOthers = game.players.filter(p => p.alive && p.name !== terrorist.name);

        // Helper to build a select
        function makeTargetSelect(id, currentValue) {
            const sel = document.createElement("select");
            sel.id = id;
            const empty = document.createElement("option");
            empty.value = "";
            empty.textContent = "-- choose --";
            sel.appendChild(empty);

            livingOthers.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.name;
                opt.textContent = p.name;
                sel.appendChild(opt);
            });

            if (currentValue) sel.value = currentValue;
            return sel;
        }

        // Current saved targets (up to 3)
        const saved = game.firstNight.bombTargets || [];

        const primarySel = makeTargetSelect("terroristPrimary", saved[0]);
        const sec1Sel = makeTargetSelect("terroristSec1", saved[1]);
        const sec2Sel = makeTargetSelect("terroristSec2", saved[2]);

        const okBtn = document.createElement("button");
        okBtn.textContent = t('ok');
        okBtn.style.marginLeft = "6px";
        okBtn.onclick = () => {
            const targets = [
                primarySel.value,
                sec1Sel.value,
                sec2Sel.value
            ].filter(v => v);

            if (targets.length === 0) {
                alert("Please select at least one target or use Skip.");
                return;
            }

            if (setBombTargets(targets)) {
                renderBombTargetsDisplay(wrapper, targets);
                logAction(`Terrorist bomb targets set: ${targets.join(', ')}`);
            }
        };

        const skipBtn = document.createElement("button");
        skipBtn.textContent = t('skip');
        skipBtn.style.marginLeft = "4px";
        skipBtn.onclick = () => {
            skipBombPlant();
            wrapper.querySelectorAll('.bomb-info').forEach(el => el.remove());
            const skippedNote = document.createElement("div");
            skippedNote.className = "bomb-info";
            skippedNote.style.fontStyle = "italic";
            skippedNote.textContent = t('bombSkipped');
            wrapper.appendChild(skippedNote);
            logAction('Terrorist skipped planting the bomb.');
        };

        // Three manual dropdowns — user chooses the primary + the two players caught in the blast
        const header = document.createElement("div");
        header.style.marginBottom = "6px";
        header.textContent = `Terrorist (${terrorist.name}) plants a bomb on:`;

        const row1 = document.createElement("div");
        row1.style.marginBottom = "4px";
        row1.appendChild(document.createTextNode("Primary target (bomb planted on): "));
        row1.appendChild(primarySel);

        const row2 = document.createElement("div");
        row2.style.marginBottom = "6px";
        row2.appendChild(document.createTextNode("Players caught in the blast: "));
        row2.appendChild(sec1Sel);
        row2.appendChild(document.createTextNode(" and "));
        row2.appendChild(sec2Sel);

        wrapper.appendChild(header);
        wrapper.appendChild(row1);
        wrapper.appendChild(row2);
        wrapper.appendChild(okBtn);
        wrapper.appendChild(skipBtn);

        // Restore previous display if targets were already chosen
        if (saved.length > 0 && !game.firstNight.bombSkipped) {
            renderBombTargetsDisplay(wrapper, saved);
        } else if (game.firstNight.bombSkipped) {
            const skipped = document.createElement("div");
            skipped.className = "bomb-info";
            skipped.style.fontStyle = "italic";
            skipped.textContent = t('bombSkipped');
            wrapper.appendChild(skipped);
        }

        section.appendChild(wrapper);
        container.appendChild(section);
    }

    if (container.innerHTML === "") {
        container.innerHTML = `<p>${t('noFirstNightActions')}</p>`;
    }
}

function renderBombTargetsDisplay(section, targets) {
    // Remove previous display
    section.querySelectorAll('.bomb-info').forEach(el => el.remove());

    if (!targets || targets.length === 0) return;

    const info = document.createElement("div");
    info.className = "bomb-info";
    info.style.marginTop = "6px";
    info.style.fontSize = "0.9em";

    const primary = targets[0];
    const secondaries = targets.slice(1);

    // Find terrorist name for nice display
    const terrorist = game.players.find(p => p.roleKey === 'roleTerrorist' && p.alive);
    const tName = terrorist ? terrorist.name : 'Terrorist';

    let html = `Terrorist (${tName}) plants a bomb on <strong>${primary}</strong>.`;
    if (secondaries.length > 0) {
        html += ` ${secondaries.join(" and ")} are also in the blast radius.`;
    }
    info.innerHTML = html;
    section.appendChild(info);
}

function proceedToDay() {
    const winner = advanceToDay();
    if (winner) {
        alert(`${winner} wins! (Game over)`);
        return;
    }

    alert("Day 1 begins. (Day screen not implemented yet)");
    console.log("Current game state:", game);
}

function goBackToWhosWho() {
    // Hide roster when going back
    hideRoster();
    const rosterBtn = document.getElementById("rosterToggleBtn");
    if (rosterBtn) rosterBtn.style.display = "none";

    showScreen("screenWhosWho");
}

// ============================================================
// ROSTER (available from First Night onward)
// ============================================================

function toggleRoster() {
    const dialog = document.getElementById("rosterDialog");
    if (!dialog) return;
    if (dialog.style.display === "block") {
        hideRoster();
    } else {
        renderRoster();
        const titleEl = document.getElementById("rosterTitle");
        if (titleEl) titleEl.textContent = t('rosterTitle');
        dialog.style.display = "block";
        const overlay = document.getElementById("rosterOverlay");
        if (overlay) overlay.style.display = "block";
    }
}

function hideRoster() {
    const dialog = document.getElementById("rosterDialog");
    const overlay = document.getElementById("rosterOverlay");
    if (dialog) dialog.style.display = "none";
    if (overlay) overlay.style.display = "none";
}

function renderRoster() {
    const container = document.getElementById("rosterContent");
    if (!container) return;
    container.innerHTML = "";

    const living = game.players.filter(p => p.alive);
    const dead = game.players.filter(p => !p.alive);

    // Group living by alignment (order: Town, Mafia, Independent)
    const groups = [
        { key: 'Town', label: t('townAligned'), list: living.filter(p => p.alignment === 'Town') },
        { key: 'Mafia', label: t('mafiaAligned'), list: living.filter(p => p.alignment === 'Mafia') },
        { key: 'Independent', label: t('independentAligned'), list: living.filter(p => p.alignment === 'Independent') },
    ];

    const livingHeader = document.createElement("div");
    livingHeader.innerHTML = `<strong>${t('livingPlayers')} (${living.length})</strong>`;
    container.appendChild(livingHeader);

    groups.forEach(g => {
        if (g.list.length === 0) return;
        const header = document.createElement("div");
        header.style.marginTop = "6px";
        header.style.fontWeight = "bold";
        header.textContent = `${g.label} (${g.list.length})`;
        container.appendChild(header);

        g.list.forEach(p => {
            const row = document.createElement("div");
            row.style.marginLeft = "8px";
            row.textContent = `${p.name} (${getRoleDisplayWithNumber(p)})`;
            container.appendChild(row);
        });
    });

    // Dead players (basic stub — will get richer cause data later)
    if (dead.length > 0) {
        const deadHeader = document.createElement("div");
        deadHeader.style.marginTop = "12px";
        deadHeader.innerHTML = `<strong>${t('deadPlayers')} (${dead.length})</strong>`;
        container.appendChild(deadHeader);

        dead.forEach(p => {
            const row = document.createElement("div");
            row.style.marginLeft = "8px";
            row.style.color = "#666";
            row.textContent = `${p.name} (${getRoleDisplayWithNumber(p)})`;
            container.appendChild(row);
        });
    }
}

// ============================================================
// LANGUAGE (future-proof stub)
// ============================================================

function switchLanguage(lang) {
    currentLang = lang || 'en';
    // Re-render current screen if needed (minimal for now)
    const currentScreen = document.querySelector("div[id^='screen']:not([style*='none'])");
    if (currentScreen && currentScreen.id === "screenFirstNight") {
        renderFirstNightActions();
    }
    // Roster will pick up new strings on next open
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", function() {
    try {
        buildRoleSelectUI();
        showScreen("screenSetup");

        // Ensure roster button is hidden until game starts
        const rosterBtn = document.getElementById("rosterToggleBtn");
        if (rosterBtn) rosterBtn.style.display = "none";
    } catch (e) {
        console.error("Init error:", e);
        alert("Error loading app: " + e.message);
    }
});

console.log("app.js loaded");