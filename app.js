// ============================================================
// CONSTANTS
// ============================================================
const CITIZEN_KEY = "roleCitizen";
const NUMBERED_ROLE_KEYS = new Set(["roleMafia", "roleVigilante"]);

// Night wakeup sequence state
let nightCardStates = [];
let currentNightCardIdx = 0;

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(screenId) {
    document.querySelectorAll("div[id^='screen']").forEach(s => s.style.display = "none");
    const target = document.getElementById(screenId);
    if (target) target.style.display = "block";
}

// ============================================================
// SETUP SCREEN
// ============================================================
function getRolesForAlignment(alignment) {
    return Object.entries(ROLES)
        .filter(([key, role]) => role.alignment === alignment && key !== CITIZEN_KEY)
        .map(([key, role]) => ({ key, ...role }));
}

function isSpinnerRole(role) {
    return role.cap !== 1;
}

function spinnerLabel(role) {
    if (role.displayName === "Mafia Member") return "Mafia members";
    if (role.displayName === "Freemason") return "Freemasons";
    if (role.displayName === "Vigilante") return "Vigilantes";
    return role.displayName + "s";
}

function buildRoleControl(roleKey, role) {
    const row = document.createElement("div");
    row.style.marginBottom = "4px";

    if (isSpinnerRole(role)) {
        const label = document.createElement("label");
        const max = role.cap === Infinity ? 99 : role.cap;
        label.textContent = spinnerLabel(role) + ": ";
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(max);
        input.value = "0";
        input.dataset.roleKey = roleKey;
        input.style.width = "50px";
        input.addEventListener("input", updateCitizenCount);
        label.appendChild(input);
        row.appendChild(label);
    } else {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.dataset.roleKey = roleKey;
        input.addEventListener("change", updateCitizenCount);
        label.appendChild(input);
        label.appendChild(document.createTextNode(" " + role.displayName));
        row.appendChild(label);
    }
    return row;
}

function buildRoleSelectUI() {
    const townCol = document.getElementById("townRolesColumn");
    const mafiaCol = document.getElementById("mafiaRolesColumn");
    const indepCol = document.getElementById("indepRolesColumn");
    townCol.innerHTML = "<strong>TOWN</strong><br>";
    mafiaCol.innerHTML = "<strong>MAFIA</strong><br>";
    indepCol.innerHTML = "<strong>INDEPENDENTS</strong><br>";

    getRolesForAlignment("Town").forEach(r => townCol.appendChild(buildRoleControl(r.key, r)));
    getRolesForAlignment("Mafia").forEach(r => mafiaCol.appendChild(buildRoleControl(r.key, r)));
    getRolesForAlignment("Independent").forEach(r => indepCol.appendChild(buildRoleControl(r.key, r)));
}

function parsePlayerNames(rawText) {
    return rawText.split("\n").map(n => n.trim()).filter(n => n.length > 0);
}

function loadPlayersFromNames(names) {
    game.players = names.map((name, index) => ({
        id: index + 1,
        name,
        role: "Unassigned",
        alignment: "Unaligned",
        alive: true,
        roleKey: null,
        roleNumber: null,
    }));
    document.getElementById("playerCount").textContent = game.players.length;
    updateCitizenCount();
}

function openPlayerEditDialog() {
    document.getElementById("playerInput").value = game.players.map(p => p.name).join("\n");
    document.getElementById("playerEditDialog").style.display = "block";
    document.getElementById("playerEditOverlay").style.display = "block";
}

function closePlayerEditDialog() {
    document.getElementById("playerEditDialog").style.display = "none";
    document.getElementById("playerEditOverlay").style.display = "none";
}

function savePlayersFromDialog() {
    const rawText = document.getElementById("playerInput").value.trim();
    if (!rawText) { alert("Please enter at least one player name!"); return; }
    loadPlayersFromNames(parsePlayerNames(rawText));
    closePlayerEditDialog();
}

function readRoleCountsFromUI() {
    const counts = {};
    document.querySelectorAll("#screenSetup [data-role-key]").forEach(el => {
        const key = el.dataset.roleKey;
        counts[key] = el.type === "checkbox" ? (el.checked ? 1 : 0) : Math.max(0, parseInt(el.value, 10) || 0);
    });
    return counts;
}

function totalAssignedRoles(counts) {
    return Object.values(counts).reduce((s, n) => s + n, 0);
}

function updateCitizenCount() {
    const playerCount = game.players.length;
    const counts = readRoleCountsFromUI();
    const citizens = playerCount - totalAssignedRoles(counts);
    document.getElementById("citizenCount").textContent = Math.max(0, citizens);
    document.getElementById("citizenCountWarning").style.display = citizens < 0 ? "inline" : "none";
}

function readSettingsFromUI() {
    game.settings.requireMafia = document.getElementById("settingRequireMafia").checked;
    game.settings.randomAssign = document.getElementById("settingRandomAssign").checked;
    game.settings.revealOnDeath = document.getElementById("settingRevealOnDeath").checked;
    game.settings.mafiaWakeMode = document.getElementById("settingMafiaGroupWake").checked ? 'group' : 'individual';
    game.settings.serialKillerFrequency = parseInt(document.getElementById("settingSkFrequency").value, 10) || 2;
}

// ============================================================
// WHO'S WHO SCREEN
// ============================================================
function getSlotDisplayName(roleKey, role, indexOneBased) {
    return NUMBERED_ROLE_KEYS.has(roleKey) ? `${role.displayName} #${indexOneBased}` : role.displayName;
}

function buildAssignmentSlots(counts) {
    const slots = [];
    for (const [key, count] of Object.entries(counts)) {
        if (key === CITIZEN_KEY || count < 1) continue;
        const role = ROLES[key];
        for (let i = 0; i < count; i++) {
            const roleNumber = NUMBERED_ROLE_KEYS.has(key) ? i + 1 : null;
            slots.push({
                slotId: key + "_" + i,
                roleKey: key,
                roleName: role.displayName,
                displayName: getSlotDisplayName(key, role, i + 1),
                roleNumber,
                alignment: role.alignment,
                assignedPlayerId: null
            });
        }
    }
    return slots;
}

function continueToWhosWho() {
    if (game.players.length === 0) { alert("Please add at least one player (Edit List)."); return; }

    const counts = readRoleCountsFromUI();
    game.roleCounts = counts;
    readSettingsFromUI();

    if (totalAssignedRoles(counts) > game.players.length) { alert("You have assigned more roles than there are players."); return; }
    if (game.settings.requireMafia && (counts.roleMafia || 0) < 1) { alert("You need at least 1 Mafia Member (or uncheck the setting)."); return; }

    game.assignmentSlots = buildAssignmentSlots(counts);
    if (game.settings.randomAssign) randomizeAssignments();

    renderWhosWhoScreen();
    showScreen("screenWhosWho");
}

function getAssignedPlayerIds(excludeSlotId) {
    const taken = new Set();
    game.assignmentSlots.forEach(s => { if (s.slotId !== excludeSlotId && s.assignedPlayerId !== null) taken.add(s.assignedPlayerId); });
    return taken;
}

function getUnassignedPlayers(excludeSlotId) {
    const taken = getAssignedPlayerIds(excludeSlotId);
    return game.players.filter(p => !taken.has(p.id));
}

function renderWhosWhoScreen() {
    const container = document.getElementById("roleAssignmentList");
    container.innerHTML = "";

    if (game.assignmentSlots.length === 0) {
        container.textContent = "No special roles selected — everyone will be a Citizen.";
    }

    game.assignmentSlots.forEach(slot => {
        const row = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = slot.displayName + ": ";
        const select = document.createElement("select");
        select.dataset.slotId = slot.slotId;

        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "-- choose player --";
        select.appendChild(empty);

        const available = getUnassignedPlayers(slot.slotId);
        available.forEach(p => {
            const opt = document.createElement("option");
            opt.value = String(p.id);
            opt.textContent = p.name;
            if (slot.assignedPlayerId === p.id) opt.selected = true;
            select.appendChild(opt);
        });

        if (slot.assignedPlayerId !== null) {
            const assigned = game.players.find(p => p.id === slot.assignedPlayerId);
            if (assigned && !available.some(p => p.id === assigned.id)) {
                const opt = document.createElement("option");
                opt.value = String(assigned.id);
                opt.textContent = assigned.name;
                opt.selected = true;
                select.insertBefore(opt, select.firstChild.nextSibling);
            }
        }

        select.addEventListener("change", () => {
            game.assignmentSlots.find(s => s.slotId === slot.slotId).assignedPlayerId = select.value ? parseInt(select.value, 10) : null;
            renderWhosWhoScreen();
        });

        label.appendChild(select);
        row.appendChild(label);
        container.appendChild(row);
    });

    updateCitizenPreview();
}

function updateCitizenPreview() {
    const preview = document.getElementById("citizenPreview");
    if (!preview) return;
    const unassigned = getUnassignedPlayers();
    preview.textContent = unassigned.length === 0
        ? "All players have special roles assigned."
        : `Citizens (${unassigned.length}): ${unassigned.map(p => p.name).join(", ")}`;
}

function randomizeAssignments() {
    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    game.assignmentSlots.forEach((slot, index) => { slot.assignedPlayerId = shuffled[index] ? shuffled[index].id : null; });
}

function randomizeAndRedraw() {
    randomizeAssignments();
    renderWhosWhoScreen();
}

function applyRoleAssignments() {
    const citizenRole = ROLES[CITIZEN_KEY];
    game.players.forEach(p => {
        p.role = citizenRole.displayName;
        p.roleKey = CITIZEN_KEY;
        p.roleNumber = null;
        p.alignment = citizenRole.alignment;
    });
    game.assignmentSlots.forEach(slot => {
        if (slot.assignedPlayerId === null) return;
        const player = game.players.find(p => p.id === slot.assignedPlayerId);
        if (player) {
            player.role = slot.displayName;
            player.roleKey = slot.roleKey;
            player.roleNumber = slot.roleNumber;
            player.alignment = slot.alignment;
        }
    });
}

function confirmRoleAssignments() {
    if (game.assignmentSlots.some(s => s.assignedPlayerId === null)) {
        alert("Please assign a player to every special role before continuing.");
        return;
    }
    applyRoleAssignments();
    logAction("Role assignments confirmed.");
    advanceToFirstNight();
    renderFirstNightScreen();
    showScreen("screenFirstNight");
}

// ============================================================
// FIRST NIGHT SCREEN
// ============================================================
function renderFirstNightScreen() {
    const container = document.getElementById("firstNightContent");
    container.innerHTML = "";
    const summary = document.getElementById("firstNightSummary");
    summary.textContent = "";

    // Freemason team reveal
    const freemasons = game.players.filter(p => p.alive && p.roleKey === "roleFreemason");
    if (freemasons.length > 0) {
        const div = document.createElement("div");
        div.className = "firstNightGroup";
        div.innerHTML = `<h4>Freemasons</h4><p>Wake up and acknowledge each other:</p><ul>${freemasons.map(p => `<li>${p.name}</li>`).join("")}</ul>`;
        container.appendChild(div);
        logAction(`Freemasons wake together: ${freemasons.map(p => p.name).join(", ")}.`);
    }

    // Mafia team reveal
    const mafias = game.players.filter(p => p.alive && p.roleKey === "roleMafia");
    const boss = game.players.find(p => p.alive && p.roleKey === "roleBoss");
    if (mafias.length > 0 || boss) {
        const mafiaNames = [...mafias, ...(boss ? [boss] : [])].map(p => p.name).join(", ");
        const div = document.createElement("div");
        div.className = "firstNightGroup";
        div.innerHTML = `<h4>Mafia</h4><p>Wake up and acknowledge each other:</p><ul>${[...mafias, ...(boss ? [boss] : [])].map(p => `<li>${p.name} — ${p.role}</li>`).join("")}</ul>`;
        container.appendChild(div);
        logAction(`Mafia wake together: ${mafiaNames}.`);
    }

    // Terrorist bomb placement
    const terrorist = game.players.find(p => p.alive && p.roleKey === "roleTerrorist");
    if (terrorist) {
        const div = document.createElement("div");
        div.className = "firstNightGroup";
        div.innerHTML = `<h4>Terrorist</h4><p>${terrorist.name}, choose someone to plant a bomb on:</p>
            <select id="terroristBombTarget">${getLivingPlayerOptions(terrorist.id)}</select>
            <button type="button" onclick="confirmBombPlacement()">Plant Bomb</button>`;
        container.appendChild(div);
    }

    // If no terrorist, nothing else to do
    const terr = game.players.find(p => p.alive && p.roleKey === "roleTerrorist");
    if (!terr) {
        summary.textContent = "Nothing else happens on the first night. Continue to Day 1.";
    }
}

function getLivingPlayerOptions(excludeId) {
    return getLivingPlayers()
        .filter(p => p.id !== excludeId)
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join("");
}

function confirmBombPlacement() {
    const targetId = parseInt(document.getElementById("terroristBombTarget").value, 10);
    if (!targetId) { alert("Select a bomb target."); return; }
    game.firstNight.bombTarget = targetId;
    const target = getPlayerById(targetId);
    logAction(`Terrorist plants bomb on ${target.name}.`);
    document.getElementById("firstNightSummary").textContent = `Bomb planted on ${target.name}. Continue to Day 1.`;
    document.querySelector("#firstNightContent .firstNightGroup:last-child").innerHTML = `<p><em>Bomb planted on ${target.name}.</em></p>`;
}

function confirmFirstNight() {
    game.firstNight.completed = true;
    logAction("First night ends.");
    advanceToDay();
    renderDayScreen();
    showScreen("screenDay");
}

// ============================================================
// DAY SCREEN
// ============================================================
let accusations = [{ accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }];
let lynchVotes = {};
let rabbleUsedExtraLynch = false;

function renderDayScreen() {
    // Check for Hunter revenge events before rendering
    const hunterPending = game.pendingEvents.find(e => e.type === 'hunterRevenge');
    if (hunterPending) {
        openHunterDialog(hunterPending.playerId);
        return; // dialog will re-render after resolution
    }

    document.getElementById("dayNumber").textContent = game.day;
    const living = getLivingPlayers();
    document.getElementById("livingCount").textContent = living.length;

    const threshold = Math.ceil(living.length / 2);
    document.getElementById("thresholdDisplay").textContent = threshold;

    lynchVotes = {};
    rabbleUsedExtraLynch = false;

    const isFirstDay = game.day === 1;
    document.getElementById("noLynchDay").style.display = isFirstDay ? "block" : "none";
    document.getElementById("lynchActive").style.display = isFirstDay ? "none" : "block";
    document.getElementById("voteSection").style.display = "none";
    document.getElementById("lynchResult").style.display = "none";

    // Reset accusations
    accusations = [{ accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }];
    renderAccusationRows();

    // Update mayor display
    const mayor = game.special.mayorId ? getPlayerById(game.special.mayorId) : null;
    document.getElementById("mayorName").textContent = mayor ? mayor.name : "None";
    document.getElementById("mayorBtn").disabled = !!mayor;

    // Anarchist
    const anarchist = game.players.find(p => p.alive && p.roleKey === "roleAnarchist");
    document.getElementById("anarchistSection").style.display = anarchist && !game.special.anarchistUsed ? "block" : "none";

    // Terrorist detonate
    const terrorist = game.players.find(p => p.alive && p.roleKey === "roleTerrorist");
    document.getElementById("terroristSection").style.display = terrorist && game.firstNight.bombTarget ? "block" : "none";

    renderRosterContent();
    setRosterAvailable(true);
}

function renderAccusationRows() {
    const container = document.getElementById("accusationRows");
    container.innerHTML = "";

    accusations.forEach((acc, i) => {
        const row = document.createElement("div");
        row.className = "accusationRow";

        const accusedSelect = document.createElement("select");
        accusedSelect.dataset.accIdx = i;
        accusedSelect.innerHTML = `<option value="">-- accused --</option>` + getLivingPlayerOptions(null);
        if (acc.accusedId) accusedSelect.value = String(acc.accusedId);
        accusedSelect.addEventListener("change", () => {
            accusations[i].accusedId = accusedSelect.value ? parseInt(accusedSelect.value, 10) : null;
        });

        const label = document.createElement("label");
        label.textContent = " accused by ";

        const accuserSelect = document.createElement("select");
        accuserSelect.dataset.accIdx = i;
        accuserSelect.innerHTML = `<option value="">-- accuser --</option>` + getLivingPlayerOptions(null);
        if (acc.accuserId) accuserSelect.value = String(acc.accuserId);
        accuserSelect.addEventListener("change", () => {
            accusations[i].accuserId = accuserSelect.value ? parseInt(accuserSelect.value, 10) : null;
        });

        row.appendChild(accusedSelect);
        row.appendChild(label);
        row.appendChild(accuserSelect);
        container.appendChild(row);
    });
}

function startLynchVote() {
    // Validate at least one accusation is filled
    const filled = accusations.filter(a => a.accusedId && a.accuserId);
    if (filled.length === 0) { alert("Enter at least one accusation."); return; }

    document.getElementById("lynchActive").style.display = "none";
    document.getElementById("voteSection").style.display = "block";

    const container = document.getElementById("voteRows");
    container.innerHTML = "";

    const living = getLivingPlayers();
    const threshold = Math.ceil(living.length / 2);
    document.getElementById("lynchThreshold").textContent = threshold;

    filled.forEach(acc => {
        const accused = getPlayerById(acc.accusedId);
        const row = document.createElement("div");
        row.className = "voteRow";

        const name = document.createElement("span");
        name.textContent = accused.name + " — Votes: ";

        const spinner = document.createElement("input");
        spinner.type = "number";
        spinner.min = "0";
        spinner.max = String(living.length);
        spinner.value = "0";
        spinner.dataset.accusedId = acc.accusedId;
        spinner.addEventListener("input", () => {
            lynchVotes[acc.accusedId] = parseInt(spinner.value, 10) || 0;
        });

        row.appendChild(name);
        row.appendChild(spinner);
        container.appendChild(row);

        lynchVotes[acc.accusedId] = 0;
    });
}

function resolveLynch() {
    const living = getLivingPlayers();
    const threshold = Math.ceil(living.length / 2);

    let lynched = null;
    for (const [accusedId, votes] of Object.entries(lynchVotes)) {
        if (votes >= threshold) {
            const p = getPlayerById(parseInt(accusedId, 10));
            if (p && p.alive) {
                lynched = p;
                break;
            }
        }
    }

    document.getElementById("voteSection").style.display = "none";
    document.getElementById("lynchResult").style.display = "block";

    if (lynched) {
        // Check Lucky
        if (lynched.roleKey === "roleLucky" && !lynched._luckyUsed) {
            lynched._luckyUsed = true;
            lynched.roleKey = CITIZEN_KEY;
            lynched.role = ROLES[CITIZEN_KEY].displayName;
            logAction(`${lynched.name} (Lucky Citizen) was lynched but the rope snapped! They survive.`);
            document.getElementById("lynchResultMessage").textContent = `The rope snaps! ${lynched.name} survives and is now a Citizen.`;
        } else {
            killPlayer(lynched.id, "lynched");
            document.getElementById("lynchResultMessage").textContent = `${lynched.name} was lynched.`;
        }

        rabbleUsedExtraLynch = false;
    } else {
        document.getElementById("lynchResultMessage").textContent = `No one reached the threshold (${threshold} votes). No one is lynched.`;
    }

    // Check if Rabble Rouser is alive for another round
    const rabbleAlive = game.players.some(p => p.alive && p.roleKey === "roleRabble");
    document.getElementById("nextLynchBtn").style.display = rabbleAlive ? "inline-block" : "none";
}

function resetLynchCycle() {
    document.getElementById("lynchResult").style.display = "none";
    document.getElementById("lynchActive").style.display = "block";
    accusations = [{ accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }, { accusedId: null, accuserId: null }];
    renderAccusationRows();
    lynchVotes = {};
}

function advanceToNightFromDay() {
    const winner = checkWinCondition();
    if (winner) {
        showGameOver(winner);
        return;
    }
    advanceToNight();
    renderNightScreen();
    showScreen("screenNight");
}

// ─── Mayor Election ──────────────────────────────────────
function openMayorDialog() {
    const select = document.getElementById("mayorSelect");
    select.innerHTML = getLivingPlayers().map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    document.getElementById("mayorDialog").style.display = "block";
    document.getElementById("mayorOverlay").style.display = "block";
}

function closeMayorDialog() {
    document.getElementById("mayorDialog").style.display = "none";
    document.getElementById("mayorOverlay").style.display = "none";
}

function electMayor() {
    const id = parseInt(document.getElementById("mayorSelect").value, 10);
    if (!id) { alert("Select a player."); return; }
    game.special.mayorId = id;
    const mayor = getPlayerById(id);
    logAction(`${mayor.name} is elected Mayor.`);
    document.getElementById("mayorName").textContent = mayor.name;
    document.getElementById("mayorBtn").disabled = true;
    closeMayorDialog();
}

// ─── Anarchist Kill ──────────────────────────────────────
function openAnarchistDialog() {
    const select = document.getElementById("anarchistTargetSelect");
    select.innerHTML = getLivingPlayerOptions(null);
    document.getElementById("anarchistDialog").style.display = "block";
    document.getElementById("anarchistOverlay").style.display = "block";
}

function closeAnarchistDialog() {
    document.getElementById("anarchistDialog").style.display = "none";
    document.getElementById("anarchistOverlay").style.display = "none";
}

function triggerAnarchistKill() {
    const targetId = parseInt(document.getElementById("anarchistTargetSelect").value, 10);
    if (!targetId) { alert("Select a target."); return; }
    game.special.anarchistUsed = true;
    killPlayer(targetId, "Anarchist kill");
    logAction(`Anarchist kills ${getPlayerById(targetId).name}.`);
    closeAnarchistDialog();
    document.getElementById("anarchistSection").style.display = "none";
    renderDayScreen();
}

// ─── Terrorist Detonate ──────────────────────────────────
function openTerroristDialog() {
    const target = getPlayerById(game.firstNight.bombTarget);
    if (!target) { alert("No bomb has been planted."); return; }
    document.getElementById("terroristBombInfo").innerHTML = `Bomb planted on: <strong>${target.name}</strong> (ID: ${target.id})`;
    document.getElementById("terroristDialog").style.display = "block";
    document.getElementById("terroristOverlay").style.display = "block";
}

function closeTerroristDialog() {
    document.getElementById("terroristDialog").style.display = "none";
    document.getElementById("terroristOverlay").style.display = "none";
}

function detonateBomb() {
    const bombId = game.firstNight.bombTarget;
    const target = getPlayerById(bombId);
    if (!target) { closeTerroristDialog(); return; }

    // Find adjacent players in the sorted player list (by id order)
    const sortedPlayers = [...game.players].sort((a, b) => a.id - b.id);
    const idx = sortedPlayers.findIndex(p => p.id === bombId);
    const toKill = [bombId];
    if (idx > 0) toKill.push(sortedPlayers[idx - 1].id);
    if (idx < sortedPlayers.length - 1) toKill.push(sortedPlayers[idx + 1].id);

    const victimNames = toKill.map(id => { const p = getPlayerById(id); return p ? p.name : ""; }).filter(Boolean).join(", ");
    logAction(`Terrorist detonates bomb on ${target.name}! Killed: ${victimNames}.`);

    toKill.forEach(id => killPlayer(id, "bomb explosion"));
    game.firstNight.bombTarget = null;

    document.getElementById("terroristSection").style.display = "none";
    closeTerroristDialog();

    // Re-render day screen to reflect deaths
    renderDayScreen();
}

// ─── Hunter Revenge ──────────────────────────────────────
function openHunterDialog(hunterId) {
    const hunter = getPlayerById(hunterId);
    if (!hunter || !game.pendingEvents.some(e => e.type === 'hunterRevenge' && e.playerId === hunterId)) return;

    document.getElementById("hunterDialogMessage").textContent = `${hunter.name} (Hunter) was killed. They can take one person with them.`;
    const select = document.getElementById("hunterTargetSelect");
    select.innerHTML = getLivingPlayers().map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    select.dataset.hunterId = hunterId;

    document.getElementById("hunterDialog").style.display = "block";
    document.getElementById("hunterOverlay").style.display = "block";
}

function closeHunterDialog() {
    document.getElementById("hunterDialog").style.display = "none";
    document.getElementById("hunterOverlay").style.display = "none";
}

function processHunterRevenge() {
    const hunterId = parseInt(document.getElementById("hunterTargetSelect").dataset.hunterId, 10);
    const targetId = parseInt(document.getElementById("hunterTargetSelect").value, 10);
    const hunter = getPlayerById(hunterId);
    const target = getPlayerById(targetId);

    if (!targetId || !target) { alert("Select a target."); return; }
    if (!target.alive) return;

    killPlayer(targetId, "Hunter revenge");
    logAction(`${hunter ? hunter.name : "Hunter"} takes ${target.name} with them.`);

    // Remove pending event
    game.pendingEvents = game.pendingEvents.filter(e => !(e.type === 'hunterRevenge' && e.playerId === hunterId));
    closeHunterDialog();
    renderDayScreen();
}

function processHunterSkip() {
    const hunterId = parseInt(document.getElementById("hunterTargetSelect").dataset.hunterId, 10);
    game.pendingEvents = game.pendingEvents.filter(e => !(e.type === 'hunterRevenge' && e.playerId === hunterId));
    closeHunterDialog();
}

// ============================================================
// NIGHT SCREEN
// ============================================================
function renderNightScreen() {
    document.getElementById("nightNumber").textContent = game.night;
    document.getElementById("nightComplete").style.display = "none";
    document.getElementById("nightInstructions").textContent = "Roles wake in order. Complete each action to proceed.";

    const container = document.getElementById("nightActionQueue");
    container.innerHTML = "";

    // Build wakeup cards
    nightCardStates = [];
    currentNightCardIdx = 0;

    WAKEUP_ORDER.forEach(entry => {
        const roleKey = entry.roleKey;
        const role = ROLES[roleKey];
        if (!role || !role.nightAction) return;

        // Check conditional
        if (role.nightAction.conditional === 'firstNightAfterDeath') {
            // Only wakes on first night after death
            const hasPending = game.pendingEvents.some(e =>
                (e.type === 'alchemistAwaken' || e.type === 'poltergeistAwaken') && !!e.playerId
            );
            if (!hasPending) return;
        }
        if (role.nightAction.conditional === 'everyOtherNight') {
            if (game.night % game.settings.serialKillerFrequency !== 0) return;
        }

        // Find living players with this role
        const players = game.players.filter(p => p.alive && p.roleKey === roleKey);
        if (players.length === 0) return;

        // Determine if we create individual cards or one card with a player selector
        const individuals = entry.individuals === true || (entry.individuals === 'adjustable' && game.settings.mafiaWakeMode === 'individual');

        if (individuals) {
            players.forEach(p => {
                nightCardStates.push({
                    roleKey,
                    displayName: role.displayName,
                    playerId: p.id,
                    playerName: p.name,
                    type: role.nightAction.type,
                    targetPool: role.nightAction.targetPool,
                    skippable: role.nightAction.skippable !== false,
                    completed: false,
                    skipped: false,
                    targetIds: [],
                });
            });
        } else {
            nightCardStates.push({
                roleKey,
                displayName: role.displayName,
                playerId: null,
                playerName: null,
                type: role.nightAction.type,
                targetPool: role.nightAction.targetPool,
                skippable: role.nightAction.skippable !== false,
                completed: false,
                skipped: false,
                targetIds: [],
                players: players.map(p => ({ id: p.id, name: p.name })),
            });
        }
    });

    if (nightCardStates.length === 0) {
        container.innerHTML = "<p>No roles have night actions tonight.</p>";
        document.getElementById("nightComplete").style.display = "block";
        return;
    }

    // Render all cards
    nightCardStates.forEach((state, idx) => {
        const card = document.createElement("div");
        card.className = "nightCard collapsed";
        card.id = "nightCard_" + idx;

        const header = document.createElement("div");
        header.className = "nightCard-header";
        const headerPlayer = state.playerName || "(choose player)";
        header.textContent = `${idx + 1}. ${state.displayName} (${headerPlayer})`;
        card.appendChild(header);

        const body = document.createElement("div");
        body.className = "nightCard-body";

        if (state.players && state.players.length > 0) {
            const playerRow = document.createElement("div");
            playerRow.className = "nightCard-target-row";
            const label = document.createElement("label");
            label.textContent = "Player: ";
            const select = document.createElement("select");
            select.id = "nightPlayerSelect_" + idx;
            select.innerHTML = state.players.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
            select.addEventListener("change", () => {
                state.playerId = parseInt(select.value, 10);
                state.playerName = state.players.find(p => p.id === state.playerId).name;
                header.textContent = `${idx + 1}. ${state.displayName} (${state.playerName})`;
            });
            state.playerId = state.players[0].id;
            state.playerName = state.players[0].name;
            playerRow.appendChild(label);
            playerRow.appendChild(select);
            body.appendChild(playerRow);
        }

        const actionDesc = getNightActionDescription(state.type);
        const instr = document.createElement("p");
        instr.className = "nightCard-instruction";
        instr.textContent = `${state.playerName || "(player)"}, ${actionDesc}`;
        body.appendChild(instr);

        if (state.targetPool !== 'none') {
            const targetRow = document.createElement("div");
            targetRow.className = "nightCard-target-row";

            const targetLabel = document.createElement("label");
            targetLabel.textContent = "Target: ";

            const targetSelect = document.createElement("select");
            targetSelect.id = "nightTargetSelect_" + idx;

            const living = getLivingPlayers().filter(p => p.id !== state.playerId);
            targetSelect.innerHTML = `<option value="">-- select target --</option>` + living.map(p => `<option value="${p.id}">${p.name}${getRoleSuffix(p)}</option>`).join("");

            targetRow.appendChild(targetLabel);
            targetRow.appendChild(targetSelect);
            body.appendChild(targetRow);
        }

        const btnRow = document.createElement("div");
        btnRow.className = "nightCard-target-row";

        const okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.textContent = "OK";
        okBtn.disabled = true;
        okBtn.addEventListener("click", () => submitNightAction(idx));

        const skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.textContent = "Skip";
        skipBtn.addEventListener("click", () => skipNightAction(idx));

        // Enable OK when target is selected
        if (state.targetPool !== 'none') {
            targetSelect.addEventListener("change", function () {
                okBtn.disabled = !this.value;
            });
        } else {
            okBtn.disabled = false;
        }

        btnRow.appendChild(okBtn);
        if (state.skippable) btnRow.appendChild(skipBtn);
        body.appendChild(btnRow);

        card.appendChild(body);
        container.appendChild(card);
    });

    // Expand first card
    if (nightCardStates.length > 0) {
        expandNightCard(0);
    }
}

function getNightActionDescription(type) {
    const descriptions = {
        block: "do you want to get anyone drunk tonight?",
        kill: "who do you want to kill tonight?",
        protect: "who do you want to protect tonight?",
        save: "who do you want to save tonight?",
        investigate: "who do you want to investigate tonight?",
        watch: "you discreetly watch the Mafia tonight.",
        reflect: "choose someone to reflect an attack onto.",
        redirect: "choose two players to swap (select same player twice for no swap).",
        markResurrection: "choose someone to mark. When they die, you will resurrect.",
        possess: "choose someone to possess tonight.",
        task: "choose someone to give a random task to.",
        debuff: "choose someone to blind, mute, or paralyze.",
        save: "who do you want to save tonight?",
        poison: "who do you want to poison tonight?",
    };
    return descriptions[type] || "who do you target?";
}

function getRoleSuffix(player) {
    if (!game.settings.revealOnDeath) return "";
    return "";
}

function expandNightCard(idx) {
    document.querySelectorAll(".nightCard").forEach(c => c.classList.add("collapsed"));
    document.querySelectorAll(".nightCard").forEach(c => c.classList.remove("active"));
    const card = document.getElementById("nightCard_" + idx);
    if (card) {
        card.classList.remove("collapsed");
        card.classList.add("active");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.getElementById("nightInstructions").textContent = `Step ${idx + 1} of ${nightCardStates.length}.`;
}

function submitNightAction(idx) {
    const state = nightCardStates[idx];
    if (state.completed) return;

    const targetSelect = document.getElementById("nightTargetSelect_" + idx);
    if (targetSelect) {
        const val = targetSelect.value;
        if (!val) { alert("Select a target."); return; }
        state.targetIds = [parseInt(val, 10)];
    } else {
        state.targetIds = [];
    }

    state.completed = true;
    state.skipped = false;

    // Log action
    const playerName = state.playerName || "Unknown";
    const targetName = state.targetIds.length > 0 ? (getPlayerById(state.targetIds[0]) || {}).name || "Unknown" : "(none)";
    logAction(`${state.displayName} (${playerName}) targets ${targetName}.`);

    // Record in game.nightActions
    game.nightActions.push({
        roleKey: state.roleKey,
        playerId: state.playerId,
        targetIds: state.targetIds,
        type: state.type,
        skipped: false,
    });

    markCardDone(idx);
}

function skipNightAction(idx) {
    const state = nightCardStates[idx];
    if (state.completed) return;

    state.completed = true;
    state.skipped = true;
    state.targetIds = [];

    const playerName = state.playerName || "Unknown";
    logAction(`${state.displayName} (${playerName}) skips action.`);

    // Record skip
    game.nightActions.push({
        roleKey: state.roleKey,
        playerId: state.playerId,
        targetIds: [],
        type: state.type,
        skipped: true,
    });

    markCardDone(idx);
}

function markCardDone(idx) {
    const card = document.getElementById("nightCard_" + idx);
    if (card) {
        card.classList.remove("active");
        card.classList.add("completed");
        card.classList.add("collapsed");
    }

    // Move to next
    currentNightCardIdx = idx + 1;
    if (currentNightCardIdx < nightCardStates.length) {
        expandNightCard(currentNightCardIdx);
    } else {
        document.getElementById("nightInstructions").textContent = "All actions collected.";
        document.getElementById("nightComplete").style.display = "block";
    }
}

// ─── Night Resolution ────────────────────────────────────
function resolveNight() {
    const actions = game.nightActions;

    logAction("--- Resolving night actions ---");

    // Phase 1: Block (Barman)
    const blockedIds = new Set();
    actions.forEach(a => {
        if (a.type === 'block' && !a.skipped) {
            blockedIds.add(a.targetIds[0]);
            logAction(`${getPlayerById(a.targetIds[0]).name} is role-blocked by the Barman.`);
        }
    });

    // Phase 2: Redirect (Bus Driver)
    let swapA = null, swapB = null;
    actions.forEach(a => {
        if (a.type === 'redirect' && !a.skipped && a.targetIds.length === 2 && a.targetIds[0] !== a.targetIds[1]) {
            swapA = a.targetIds[0];
            swapB = a.targetIds[1];
            logAction(`Bus Driver swaps ${getPlayerById(swapA).name} with ${getPlayerById(swapB).name}.`);
        }
    });

    // Phase 3: Protect (Defender)
    const protectedIds = new Set();
    actions.forEach(a => {
        if (a.type === 'protect' && !a.skipped) {
            protectedIds.add(a.targetIds[0]);
        }
    });

    // Phase 4: Save (Doctor's save negates kills)
    let doctorSaveTarget = null;
    actions.forEach(a => {
        if (a.type === 'save' && !a.skipped) {
            doctorSaveTarget = a.targetIds[0];
        }
    });

    // Phase 5: Kill actions
    const killActions = actions.filter(a => a.type === 'kill' && !a.skipped);

    // Phase 6: Poison (future - doctor's secondary ability)
    let doctorPoisonTarget = null;
    actions.forEach(a => {
        if (a.type === 'poison' && !a.skipped) {
            doctorPoisonTarget = a.targetIds[0];
        }
    });

    // Apply kills
    killActions.forEach(k => {
        let targetId = k.targetIds[0];

        // Apply bus redirect
        if (swapA !== null && targetId === swapA) targetId = swapB;
        else if (swapB !== null && targetId === swapB) targetId = swapA;

        const target = getPlayerById(targetId);
        if (!target || !target.alive) return;

        // Check blocked (actions from blocked players fail, but kills are by Mafia mostly)
        // Check protection / save
        if (protectedIds.has(targetId)) {
            logAction(`${target.name} is protected by the Defender — kill negated.`);
        } else if (doctorSaveTarget === targetId) {
            logAction(`${target.name} is saved by the Doctor — kill negated.`);
        } else {
            const killer = getPlayerById(k.playerId);
            // Vigilante guilt: if they kill a Townie, they suicide
            if (k.roleKey === 'roleVigilante' && target.alignment === 'Town') {
                killPlayer(targetId, "Vigilante kill");
                logAction(`${killer.name} (Vigilante) kills ${target.name}.`);
                // Vigilante dies from guilt
                if (killer && killer.alive) {
                    killPlayer(killer.id, "guilt over killing an ally");
                    logAction(`${killer.name} cannot deal with the guilt and dies.`);
                }
            } else {
                killPlayer(targetId, `killed by ${killer ? killer.role : 'unknown'}`);
                if (killer) logAction(`${killer.name} (${killer.role}) kills ${target.name}.`);
            }
        }
    });

    // Doctor poison
    if (doctorPoisonTarget) {
        const poisonTarget = getPlayerById(doctorPoisonTarget);
        if (poisonTarget && poisonTarget.alive) {
            game.pendingEvents.push({ type: 'poison', playerId: doctorPoisonTarget });
            logAction(`${poisonTarget.name} is poisoned by the Doctor and will die at the end of the next day.`);
        }
    }

    // Investigate
    actions.forEach(a => {
        if (a.type === 'investigate' && !a.skipped) {
            const target = getPlayerById(a.targetIds[0]);
            if (target) {
                logAction(`Detective investigates ${target.name} — they are ${target.alignment}-aligned.`);
            }
        }
    });

    // Watcher (passive — automatically knows who Mafia targeted)
    const watchers = actions.filter(a => a.type === 'watch' && !a.skipped);
    if (watchers.length > 0) {
        const mafiaKill = actions.find(a => a.type === 'kill' && a.roleKey === 'roleMafia' && !a.skipped);
        if (mafiaKill) {
            const mafiaTarget = getPlayerById(mafiaKill.targetIds[0]);
            watchers.forEach(w => {
                logAction(`Watcher (${getPlayerById(w.playerId).name}) sees the Mafia target ${mafiaTarget ? mafiaTarget.name : "someone"}.`);
            });
        }
    }

    // Mirrors — done at time of attack above conceptually, log here if needed
    // Boss debuff
    actions.forEach(a => {
        if (a.type === 'debuff' && !a.skipped) {
            const target = getPlayerById(a.targetIds[0]);
            if (target) logAction(`Boss debuffs ${target.name}.`);
        }
    });

    // Mark resurrection (Alchemist)
    actions.forEach(a => {
        if (a.type === 'markResurrection' && !a.skipped) {
            const target = getPlayerById(a.targetIds[0]);
            if (target) logAction(`Alchemist marks ${target.name} for resurrection.`);
        }
    });

    // Possess (Poltergeist)
    actions.forEach(a => {
        if (a.type === 'possess' && !a.skipped) {
            const target = getPlayerById(a.targetIds[0]);
            if (target) logAction(`Poltergeist possesses ${target.name}.`);
        }
    });

    // Jokester
    actions.forEach(a => {
        if (a.type === 'task' && !a.skipped) {
            const target = getPlayerById(a.targetIds[0]);
            if (target) logAction(`Jokester gives ${target.name} a random task.`);
        }
    });

    // Process pending events (Alchemist resurrection, Poltergeist possession, poison, etc.)
    processPendingEvents();

    // Clear night actions
    game.nightActions = [];

    logAction("--- Night resolved ---");

    const winner = checkWinCondition();
    if (winner) {
        showGameOver(winner);
        return;
    }

    advanceToDay();
    renderDayScreen();
    showScreen("screenDay");
}

function processPendingEvents() {
    const remaining = [];
    game.pendingEvents.forEach(event => {
        if (event.type === 'poison') {
            const target = getPlayerById(event.playerId);
            if (target && target.alive) {
                killPlayer(event.playerId, "poison");
                logAction(`${target.name} dies from poison.`);
            }
        } else if (event.type === 'alchemistAwaken') {
            // Already handled via night action wakeup
        } else if (event.type === 'poltergeistAwaken') {
            // Already handled via night action wakeup
        } else if (event.type === 'hunterRevenge') {
            const hunter = getPlayerById(event.playerId);
            if (hunter) {
                // UI prompt will be shown, for now log it
                logAction(`${hunter.name} (Hunter) can take someone with them.`);
                remaining.push(event); // keep it for UI to process
                continue;
            }
        } else if (event.type === 'priestConversion') {
            const priest = getPlayerById(event.playerId);
            if (priest) {
                logAction(`${priest.name} (Priest) converts their killer.`);
            }
        } else {
            remaining.push(event);
        }
    });
    game.pendingEvents = remaining;
}

// ============================================================
// GAME LOG
// ============================================================
function openGameLog() {
    renderGameLog();
    document.getElementById("gameLogDialog").style.display = "block";
    document.getElementById("gameLogOverlay").style.display = "block";
}

function closeGameLog() {
    document.getElementById("gameLogDialog").style.display = "none";
    document.getElementById("gameLogOverlay").style.display = "none";
}

function renderGameLog() {
    const container = document.getElementById("gameLogEntries");
    container.innerHTML = game.gameLog.map(entry =>
        `<div class="logEntry"><strong>[${entry.turn}]</strong> ${entry.message}</div>`
    ).join("");
    container.scrollTop = container.scrollHeight;
}

// ============================================================
// GAME OVER
// ============================================================
function showGameOver(winner) {
    game.phase = "gameOver";
    logAction(`${winner} wins the game!`);
    renderGameLog();
    openGameLog();
    document.querySelector("#gameLogDialog h3").textContent = `Game Over — ${winner} Wins!`;
}

// ============================================================
// ROSTER
// ============================================================
function renderRosterContent() {
    const container = document.getElementById("rosterContent");
    if (!container) return;
    container.innerHTML = "<ul>" + game.players.map(p => {
        const extra = (!p.alive && game.settings.revealOnDeath) ? ` (was ${p.role})` : "";
        return `<li>${p.name} — ${p.alive ? p.role : "Dead"} (${p.alignment})${p.alive ? "" : " [dead]"}</li>`;
    }).join("") + "</ul>";
}

function setRosterAvailable(visible) {
    document.getElementById("rosterToggleBtn").style.display = visible ? "block" : "none";
}

function openRosterDialog() {
    renderRosterContent();
    document.getElementById("rosterDialog").style.display = "block";
    document.getElementById("rosterOverlay").style.display = "block";
}

function closeRosterDialog() {
    document.getElementById("rosterDialog").style.display = "none";
    document.getElementById("rosterOverlay").style.display = "none";
}

// ============================================================
// HELPERS (shared)
// ============================================================
function getLivingPlayers() {
    return game.players.filter(p => p.alive);
}

function getPlayerById(id) {
    return game.players.find(p => p.id === id);
}

function getLivingPlayerOptions(excludeId) {
    return getLivingPlayers()
        .filter(p => p.id !== excludeId)
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join("");
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    try {
        console.log("Mafia Helper initializing...");
        buildRoleSelectUI();
        showScreen("screenSetup");
        console.log("Mafia Helper ready.");
    } catch (e) {
        console.error("Init error:", e);
        alert("Error loading app: " + e.message + "\n\nCheck console (F12) for details.");
    }
});

// Confirm the script parsed and executed
console.log("app.js loaded successfully.");
