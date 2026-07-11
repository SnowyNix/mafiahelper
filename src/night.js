// ============================================================
// NIGHT SCREEN
// ============================================================

function proceedToNight() {
    // For now just advance phase and log
    game.phase = 'night';
    game.night += 1;
    game.lastNightEvents = []; // clear for next day
    logAction(`Night ${game.night} begins.`);

    alert(`Night ${game.night} begins. (Night screen not implemented yet)`);
    console.log("Current game state:", game);
}
