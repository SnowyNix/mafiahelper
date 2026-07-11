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
