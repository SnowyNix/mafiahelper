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
