const game = {
    players: [],
    phase: 'setup',
    day: 0,
    night: 0,
    roleCounts: {},
    settings: {
        requireMafia: true,
        randomAssign: false,
        revealOnDeath: false,
        mafiaWakeMode: 'individual',    // 'individual' | 'group'
        serialKillerFrequency: 2,        // every N nights (2 = every other)
    },
    assignmentSlots: [],
    firstNight: { completed: false, bombTarget: null },
    lynch: {
        accusations: [], // [{ accusedId, accuserId }] max 3
        votes: {},       // { accusedId: voteCount }
        threshold: 0,
        phase: 'idle',   // 'idle' | 'accusing' | 'voting' | 'done'
    },
    special: {
        anarchistUsed: false,
        mayorId: null,
    },
    nightActions: [],     // [{ roleKey, playerId, targetIds, type }]
    gameLog: [],
    deadPlayers: [],      // players who died, for log/roster
    pendingEvents: [],    // queued events to resolve (Hunter, Alchemist, etc.)
};

// ─── Logging ───────────────────────────────────────────────────────

function logAction(message) {
    const entry = {
        turn: `${game.day ? 'Day ' + game.day : 'Night ' + game.night}`,
        phase: game.phase,
        message,
        timestamp: Date.now(),
    };
    game.gameLog.push(entry);
    console.log(`[${entry.turn}]`, entry.message);
}

// ─── Player helpers ────────────────────────────────────────────────

function getLivingPlayers() {
    return game.players.filter(p => p.alive);
}

function getDeadPlayers() {
    return game.players.filter(p => !p.alive);
}

function getPlayerById(id) {
    return game.players.find(p => p.id === id);
}

// ─── Win condition check ───────────────────────────────────────────

function checkWinCondition() {
    const living = getLivingPlayers();
    const alignments = { Town: 0, Mafia: 0, Independent: 0 };
    living.forEach(p => { if (alignments[p.alignment] !== undefined) alignments[p.alignment]++; });

    if (alignments.Mafia === 0) return 'Town';
    if (alignments.Mafia >= alignments.Town) return 'Mafia';
    return null;
}

// ─── Death handling ────────────────────────────────────────────────

function killPlayer(playerId, cause) {
    const player = getPlayerById(playerId);
    if (!player || !player.alive) return;

    player.alive = false;
    logAction(`${player.name} (${player.role}) died — ${cause}.`);

    // Trigger on-death effects
    const role = ROLES[player.roleKey];
    if (!role) return;

    if (player.roleKey === 'roleHunter') {
        game.pendingEvents.push({ type: 'hunterRevenge', playerId });
    }
    if (player.roleKey === 'rolePriest') {
        game.pendingEvents.push({ type: 'priestConversion', playerId });
    }
    if (player.roleKey === 'roleAlchemist') {
        game.pendingEvents.push({ type: 'alchemistAwaken', playerId });
    }
    if (player.roleKey === 'rolePoltergeist') {
        game.pendingEvents.push({ type: 'poltergeistAwaken', playerId });
    }
}

// ─── Phase transitions ─────────────────────────────────────────────

function advanceToFirstNight() {
    game.phase = 'firstNight';
    game.night = 1;
    logAction('Game started — entering first night.');
}

function advanceToDay() {
    const winner = checkWinCondition();
    if (winner) {
        game.phase = 'gameOver';
        logAction(`${winner} wins!`);
        return;
    }

    game.day++;
    game.phase = 'day';
    game.lynch = { accusations: [], votes: {}, threshold: 0, phase: 'idle' };
    logAction(`Day ${game.day} begins.`);
}

function advanceToNight() {
    const winner = checkWinCondition();
    if (winner) {
        game.phase = 'gameOver';
        logAction(`${winner} wins!`);
        return;
    }

    game.night++;
    game.phase = 'night';
    game.nightActions = [];
    logAction(`Night ${game.night} begins.`);
}
