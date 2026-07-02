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
        accusationsPerLynch: 3,
        lynchesPerDay: 1,
    },
    gameLog: [],
    firstNight: {
        bombTargets: [],   // [primaryTarget, secondary1, secondary2] — chosen manually by user
        bombSkipped: false,
    },
    lastNightEvents: [],  // strings shown at top of day (e.g. "Alice was killed...")
    deadLog: [],          // [{ name, roleKey, cause, turn }]
	    lynch: {
	        accusations: [],  // [{ accused: string, accuser: string }]
	        votes: {},        // { accusedName: number }
	        phase: 'idle',    // 'idle' | 'voting'
	        lynchesCompleted: 0, // how many lynches (or ended-without-victim) have been done this day
	    },
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

		// Returns names that should be excluded from the accuser dropdowns.
		// Currently a placeholder — will be populated by Priest role + players
		// paralyzed/debuffed by the Mafia Boss on the previous night.
		function getIneligibleAccusers() {
		    return [];
		}

		// Number of players allowed to cast lynch votes today.
		function getEligibleVotersCount() {
		    const living = getLivingPlayers().length;
		    const ineligible = getIneligibleAccusers().length;
		    return Math.max(0, living - ineligible);
		}

		// Returns whether another lynch (or "end without victim") is still allowed today.
		// Default is 1 lynch per day. Rabble Rouser will increase this later.
		function canPerformAnotherLynch() {
		    const max = (game.settings && game.settings.lynchesPerDay) || 1;
		    const done = (game.lynch && game.lynch.lynchesCompleted) || 0;
		    return done < max;
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
    game.lastNightEvents = [];
	    game.deadLog = [];
	    game.lynch = { accusations: [], votes: {}, phase: 'idle', lynchesCompleted: 0 };

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

	    game.day += 1;
	    game.phase = 'day';
	    game.lynch = { accusations: [], votes: {}, phase: 'idle', lynchesCompleted: 0 };
	    game.lastNightEvents = game.lastNightEvents || [];

    logAction(`Day ${game.day} begins.`);
    return null;
}

function getLynchThreshold() {
    const livingCount = getLivingPlayers().length;
    // Simple majority (more than half)
    return Math.floor(livingCount / 2) + 1;
}

// Record a death and optionally queue a summary line
function killPlayer(name, cause) {
    const player = getPlayer(name);
    if (!player || !player.alive) return false;

    player.alive = false;

    const entry = {
        name: player.name,
        roleKey: player.roleKey,
        cause: cause || 'unknown',
        turn: game.day ? `Day ${game.day}` : (game.night ? `Night ${game.night}` : 'Setup')
    };
    game.deadLog.push(entry);

    logAction(`${player.name} died — ${cause}.`);
    return true;
}

// Build / return the dynamic summary lines for the current day.
// Flexible design: base message + any queued events + night deaths.
// Call addNightEvent(msg) during night resolution to add custom lines
// (e.g. "The Mirror has shattered").
function lastNightSummary() {
    const lines = ["The town wakes."];  // static message at the start of each day

    // Explicitly queued events (flexible design pattern — call addNightEvent() from night resolution)
    if (Array.isArray(game.lastNightEvents)) {
        game.lastNightEvents.forEach(msg => {
            if (msg) lines.push(msg);
        });
    }

    // Deaths that occurred on the previous night
    const recentDeaths = (game.deadLog || []).filter(d =>
        d.turn && d.turn.toLowerCase().includes('night')
    );

    recentDeaths.forEach(d => {
        const roleName = getRoleDisplay(d.roleKey);
        lines.push(`${d.name} was killed in the night. They were the ${roleName}.`);
    });

    // Other dynamic lines can be added via addNightEvent() (design pattern)
    // e.g. addNightEvent("The Mirror has shattered.");
    // e.g. addNightEvent("Bob has been paralyzed and cannot vote today.");

    return lines;
}

// Helper to add a line to the next day's summary (called from night resolution)
function addNightEvent(message) {
    if (!game.lastNightEvents) game.lastNightEvents = [];
    game.lastNightEvents.push(message);
}
