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
    const assigned = new Set(
        Object.entries(roleAssignments)
            .filter(([slotId]) => slotId !== excludeSlotId)
            .map(([, playerName]) => playerName)
    );

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

// Randomizes all roles among all players
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
