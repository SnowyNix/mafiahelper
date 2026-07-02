// ============================================================
// SINGLE SOURCE OF TRUTH
// ============================================================

const game = {
    players: [],          // [{ name, roleKey, alignment, alive }]
    playerOrder: [],      // original order of names (for blast radius, seating, etc.)
    phase: 'setup',       // 'setup' | 'firstNight' | 'day' | 'night' | 'gameOver'
    day: 0,
    night: 0,
    settings: {
        mafiaWakeAsGroup: false,
        serialKillerFrequency: 2,
    },
    gameLog: [],
    firstNight: {
        bombTargets: [],   // [primaryTarget, secondary1, secondary2] — chosen manually by user
        bombSkipped: false,
    },
    deadLog: [],          // later: [{ name, roleKey, cause, turn }]
};

// ============================================================
// LOGGING
// ============================================================

function logAction(message) {
    const turn = game.day ? `Day ${game.day}` : (game.night ? `Night ${game.night}` : 'Setup');
    const entry = { turn, phase: game.phase, message, timestamp: Date.now() };
    game.gameLog.push(entry);
    console.log(`[${entry.turn}]`, message);
}

// ============================================================
// PLAYER HELPERS (minimal)
// ============================================================

function getLivingPlayers() {
    return game.players.filter(p => p.alive);
}

function getPlayer(name) {
    return game.players.find(p => p.name === name);
}

// ============================================================
// WIN CONDITION (basic — will expand later)
// ============================================================

function checkWinCondition() {
    const living = getLivingPlayers();
    const mafia = living.filter(p => p.alignment === 'Mafia').length;
    const town = living.filter(p => p.alignment === 'Town').length;

    if (mafia === 0) return 'Town';
    if (mafia >= town) return 'Mafia';
    return null;
}

// ============================================================
// INITIALIZATION (called from app.js after setup)
// ============================================================

function startGame(playerList, roleAssignments, settings) {
    game.players = [];
    game.playerOrder = [...playerList];
    game.day = 0;
    game.night = 0;
    game.gameLog = [];
    game.settings = { ...settings };
    game.firstNight = { bombTargets: [], bombSkipped: false };
    game.deadLog = [];

    const assigned = new Set(Object.values(roleAssignments));

    for (const [slotId, playerName] of Object.entries(roleAssignments)) {
        const roleKey = slotId.split('_')[0];
        const role = ROLES[roleKey];
        if (!role) continue;

        game.players.push({
            name: playerName,
            roleKey,
            alignment: role.alignment,
            alive: true,
        });
    }

    playerList.forEach(name => {
        if (!assigned.has(name)) {
            game.players.push({
                name,
                roleKey: 'roleCitizen',
                alignment: 'Town',
                alive: true,
            });
        }
    });

    game.phase = 'firstNight';
    logAction(`Game initialized with ${game.players.length} players.`);
}

// ============================================================
// FIRST NIGHT HELPERS
// ============================================================

function getPlayersByRoleKey(roleKey) {
    return game.players.filter(p => p.roleKey === roleKey && p.alive);
}

function getLivingPlayersInOrder() {
    return game.playerOrder
        .map(name => game.players.find(p => p.name === name))
        .filter(p => p && p.alive);
}

function getRoleDisplay(roleKey) {
    const role = ROLES[roleKey];
    return role ? role.displayName : roleKey;
}

function getRoleDisplayWithNumber(player) {
    const base = getRoleDisplay(player.roleKey);
    const roleDef = ROLES[player.roleKey];
    if (!roleDef || roleDef.cap === 1) return base;

    // Number roles with cap > 1 based on the order they appear in game.players
    // (this follows the order they were assigned in Who's Who)
    const sameRole = game.players.filter(p => p.roleKey === player.roleKey);
    const idx = sameRole.findIndex(p => p.name === player.name);
    if (idx === -1) return base;
    return `${base} #${idx + 1}`;
}

// getBlastRadius is no longer used for the Terrorist (user now picks all targets manually).
// It is kept only in case other future mechanics need seating-based logic.

function setBombTargets(targets) {
    // targets = [primary, secondary1, secondary2]
    const valid = targets.filter(t => t && getPlayer(t) && getPlayer(t).alive);
    if (valid.length === 0) return false;

    game.firstNight.bombTargets = valid;
    game.firstNight.bombSkipped = false;
    logAction(`Terrorist bomb targets set: ${valid.join(', ')}`);
    return true;
}

function skipBombPlant() {
    game.firstNight.bombTargets = [];
    game.firstNight.bombSkipped = true;
    logAction('Terrorist skipped planting the bomb.');
}

function advanceToDay() {
    const winner = checkWinCondition();
    if (winner) {
        game.phase = 'gameOver';
        logAction(`${winner} wins!`);
        return winner;
    }

    game.day = 1;
    game.phase = 'day';
    logAction('Day 1 begins.');
    return null;
}
