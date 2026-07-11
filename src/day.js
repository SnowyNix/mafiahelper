// ============================================================
// DAY SCREEN
// ============================================================

function showDayScreen() {
    const screen = document.getElementById("screenDay");
    if (!screen) return;

    // Header
    const header = document.getElementById("dayHeader");
    if (header) header.textContent = `DAY ${game.day}`;

    // Dynamic summary (lastNightSummary always starts with the static "The town wakes.")
    renderLastNightSummary();

    // Accusations / voting area
    renderAccusations();

    // Show the screen
    showScreen("screenDay");

    // Make sure roster is visible
    const rosterBtn = document.getElementById("rosterToggleBtn");
    if (rosterBtn) rosterBtn.style.display = "block";

    updateLynchButtons();
}

function renderLastNightSummary() {
    const container = document.getElementById("lastNightSummary");
    if (!container) return;
    container.innerHTML = "";

    const lines = lastNightSummary();
    lines.forEach((line, idx) => {
        const p = document.createElement("p");
        p.textContent = line;
        // First line is the static "The town wakes." message
        if (idx === 0) p.style.fontStyle = "italic";
        container.appendChild(p);
    });
}

function renderAccusations() {
    const container = document.getElementById("accusations");
    if (!container) return;
    container.innerHTML = "";

    // Check daily lynch limit (default 1). When reached, lock the lynch module.
    const maxLynches = (game.settings && game.settings.lynchesPerDay) || 1;
    const completed = (game.lynch && game.lynch.lynchesCompleted) || 0;
    const lynchLimitReached = completed >= maxLynches;

    if (lynchLimitReached && game.lynch.phase !== 'voting') {
        // Show locked state instead of accusation UI
        const msg = document.createElement("p");
        msg.style.fontStyle = "italic";
        msg.textContent = "Lynch phase complete for today. Proceed to night.";
        container.appendChild(msg);

        // Hide the action buttons container
        const actionContainer = document.getElementById("lynchActionContainer");
        if (actionContainer) actionContainer.style.display = "none";

        // Clear vote info
        const info = document.getElementById("lynchVoteInfo");
        if (info) info.innerHTML = "";

        // Also hide any stray secondary buttons
        const endBtn = document.getElementById("endLynchBtn");
        if (endBtn) endBtn.remove();
        const backBtn = document.getElementById("backToAccusationsBtn");
        if (backBtn) backBtn.remove();
        return;
    }

    // If we are here, lynch module is still available (or we are mid-vote)
    const actionContainer = document.getElementById("lynchActionContainer");
    if (actionContainer) actionContainer.style.display = "";

    const living = getLivingPlayers().map(p => p.name);
    const isVoting = game.lynch.phase === 'voting';
    const numAccusations = (game.settings && game.settings.accusationsPerLynch) || 3;

    for (let i = 0; i < numAccusations; i++) {
        const row = document.createElement("div");
        row.className = "accusationRow";
        row.style.marginBottom = "6px";

        const acc = game.lynch.accusations[i] || { accused: "", accuser: "" };

        const num = document.createElement("span");
        num.textContent = `${i + 1}. `;
        row.appendChild(num);

        if (!isVoting) {
            // Accusation mode: "1. [dropdown] accused by [dropdown]"
            // Build exclusion lists for validation rules:
            // - Accused dropdowns: cannot duplicate accuseds across rows
            // - Accuser dropdowns: only ineligible + same-row self rule
            //   (accused players are still allowed to accuse others)
            const alreadyAccused = [];
            for (let j = 0; j < numAccusations; j++) {
                const a = game.lynch.accusations[j];
                if (a && a.accused) alreadyAccused.push(a.accused);
            }
            const ineligible = getIneligibleAccusers();

            const thisAccused = acc.accused || "";
            const accusedExcludes = alreadyAccused.filter(n => n !== thisAccused);
            const accuserExcludes = [...ineligible];
            // Same-row rule: the accused in this row cannot accuse themselves
            if (thisAccused && !accuserExcludes.includes(thisAccused)) {
                accuserExcludes.push(thisAccused);
            }

            const accusedSel = createPlayerSelect(living, acc.accused, `accused-${i}`, accusedExcludes);
            const accuserSel = createPlayerSelect(living, acc.accuser, `accuser-${i}`, accuserExcludes);

            accusedSel.onchange = () => {
                updateAccusation(i, accusedSel.value, accuserSel.value);
                renderAccusations();
            };
            accuserSel.onchange = () => {
                updateAccusation(i, accusedSel.value, accuserSel.value);
                renderAccusations();
            };

            row.appendChild(accusedSel);
            row.appendChild(document.createTextNode(" accused by "));
            row.appendChild(accuserSel);
        } else {
            // Voting mode: the "accused by [player dropdown]" parts change to "Votes: [spinner]"
            const accused = acc.accused || "(no one)";
            const votes = (game.lynch.votes && game.lynch.votes[accused]) || 0;

            row.appendChild(document.createTextNode(`${accused} `));
            row.appendChild(document.createTextNode("Votes: "));

            const voteInput = document.createElement("input");
            voteInput.type = "number";
            voteInput.min = "0";
            voteInput.value = votes;
            voteInput.style.width = "50px";

            const updateVote = () => {
                if (!game.lynch.votes) game.lynch.votes = {};
                let newVal = parseInt(voteInput.value, 10) || 0;
                // Clamp so total votes never exceed eligible voters
                const eligible = (typeof getEligibleVotersCount === 'function') ? getEligibleVotersCount() : getLivingPlayers().length;
                const currentTotal = Object.values(game.lynch.votes).reduce((a, b) => a + (b || 0), 0);
                const thisOld = game.lynch.votes[accused] || 0;
                const maxForThis = eligible - (currentTotal - thisOld);
                if (newVal > maxForThis) newVal = Math.max(0, maxForThis);
                voteInput.value = newVal;
                game.lynch.votes[accused] = newVal;
                updateLynchButtons();
                updateLynchVoteInfo();
            };
            voteInput.onchange = updateVote;
            voteInput.oninput = updateVote;

            row.appendChild(voteInput);
        }

        container.appendChild(row);
    }

    updateLynchButtons();
    updateLynchVoteInfo();
}

function createPlayerSelect(options, current, id, excludeList = []) {
    const sel = document.createElement("select");
    sel.id = id;

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "-- select --";
    sel.appendChild(empty);

    options.forEach(name => {
        if (excludeList.includes(name)) return;
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        if (name === current) opt.selected = true;
        sel.appendChild(opt);
    });

    return sel;
}

function updateAccusation(index, accused, accuser) {
    if (!game.lynch.accusations[index]) {
        game.lynch.accusations[index] = { accused: "", accuser: "" };
    }
    game.lynch.accusations[index].accused = accused;
    game.lynch.accusations[index].accuser = accuser;
}

function startLynchVote() {
    // Guard: don't allow starting a vote if daily lynch limit already reached
    const maxLynches = (game.settings && game.settings.lynchesPerDay) || 1;
    const completed = (game.lynch && game.lynch.lynchesCompleted) || 0;
    if (completed >= maxLynches) return;

    // Filter valid accusations
    game.lynch.accusations = game.lynch.accusations.filter(a => a.accused && a.accuser);
    game.lynch.phase = 'voting';
    game.lynch.votes = {};

    // Initialize votes at 0
    game.lynch.accusations.forEach(a => {
        game.lynch.votes[a.accused] = 0;
    });

    renderAccusations();
    updateLynchButtons();
    updateLynchVoteInfo();
}

function updateLynchVoteInfo() {
    const info = document.getElementById("lynchVoteInfo");
    if (!info) return;

    const isVoting = game.lynch && game.lynch.phase === 'voting';
    if (!isVoting) {
        info.innerHTML = "";
        return;
    }

    const threshold = (typeof getLynchThreshold === 'function') ? getLynchThreshold() : Math.ceil(getLivingPlayers().length / 2);
    const eligible = (typeof getEligibleVotersCount === 'function') ? getEligibleVotersCount() : getLivingPlayers().length;

    let totalCast = 0;
    if (game.lynch.votes) {
        Object.values(game.lynch.votes).forEach(v => { totalCast += (parseInt(v, 10) || 0); });
    }

    const uncast = Math.max(0, eligible - totalCast);

    info.innerHTML = `
        <div>Lynch Threshold: ${threshold}</div>
        <div>Votes Still Uncast: ${uncast}</div>
    `;
}

function updateLynchButtons() {
    const btn = document.getElementById("lynchActionBtn");
    if (!btn) return;

    // If daily lynch limit already reached, do nothing (renderAccusations already hid the container)
    const maxLynches = (game.settings && game.settings.lynchesPerDay) || 1;
    const completed = (game.lynch && game.lynch.lynchesCompleted) || 0;
    if (completed >= maxLynches) {
        const endBtn = document.getElementById("endLynchBtn");
        if (endBtn) endBtn.remove();
        const backBtn = document.getElementById("backToAccusationsBtn");
        if (backBtn) backBtn.remove();
        return;
    }

    const isVoting = game.lynch.phase === 'voting';

    if (!isVoting) {
        btn.textContent = "Start Lynch Vote";
        btn.onclick = startLynchVote;
        btn.disabled = false;
        const endBtn = document.getElementById("endLynchBtn");
        if (endBtn) endBtn.remove();
        const backBtn = document.getElementById("backToAccusationsBtn");
        if (backBtn) backBtn.remove();
        return;
    }

    const threshold = (typeof getLynchThreshold === 'function') ? getLynchThreshold() : Math.ceil(getLivingPlayers().length / 2);
    let canLynch = false;
    let lynchedName = null;

    Object.entries(game.lynch.votes || {}).forEach(([name, count]) => {
        if (count >= threshold) {
            canLynch = true;
            lynchedName = name;
        }
    });

    if (canLynch) {
        btn.textContent = `Lynch ${lynchedName}`;
        btn.onclick = () => performLynch(lynchedName);
        btn.disabled = false;
    } else {
        btn.textContent = "Lynch (threshold not met)";
        btn.onclick = null;
        btn.disabled = true;
    }

    updateLynchVoteInfo();

    // "End Lynch Without Victim" (consumes the daily slot)
    let endBtn = document.getElementById("endLynchBtn");
    if (!endBtn) {
        endBtn = document.createElement("button");
        endBtn.id = "endLynchBtn";
        endBtn.textContent = "End Lynch Without Victim";
        endBtn.style.marginLeft = "8px";
        btn.parentNode.appendChild(endBtn);
    }
    endBtn.onclick = endLynchWithoutVictim;

    // "Back" (does NOT consume slot - just lets you edit accusations)
    let backBtn = document.getElementById("backToAccusationsBtn");
    if (!backBtn) {
        backBtn = document.createElement("button");
        backBtn.id = "backToAccusationsBtn";
        backBtn.textContent = "Back";
        backBtn.style.marginLeft = "4px";
        btn.parentNode.appendChild(backBtn);
    }
    backBtn.onclick = () => {
        game.lynch.phase = 'idle';
        game.lynch.votes = {};
        renderAccusations();
    };
}

function performLynch(name) {
    if (!name) return;

    const player = getPlayer(name);
    if (!player) return;

    const roleName = getRoleDisplay(player.roleKey);
    killPlayer(name, "lynched");

    // Add to summary for next day if needed (include role for clarity)
    addNightEvent(`${name} (${roleName}) was lynched.`);

    alert(`${name} (${roleName}) has been lynched!`);

    // Consume one lynch slot for the day
    game.lynch.lynchesCompleted = (game.lynch.lynchesCompleted || 0) + 1;

    // Reset lynch state but preserve the completed count
    const completed = game.lynch.lynchesCompleted;
    game.lynch = { accusations: [], votes: {}, phase: 'idle', lynchesCompleted: completed };

    // Full refresh of day UI + living lists
    renderAccusations();
    renderLastNightSummary();

    // Refresh roster if it is currently visible
    const rosterDialog = document.getElementById("rosterDialog");
    if (rosterDialog && rosterDialog.style.display === "block") {
        renderRoster();
    }

    // Check win (result ignored for now; full game-over handling later)
    if (typeof checkWinCondition === 'function') {
        checkWinCondition();
    }
}

function cancelLynchVote() {
    // Used when leaving voting mode via the non-voting path (kept for compatibility)
    game.lynch.phase = 'idle';
    game.lynch.votes = {};
    renderAccusations();
}

// Ends the current lynch vote cycle without a victim (no one is lynched).
// Consumes one daily lynch slot. Allows the GM to proceed to the night screen.
function endLynchWithoutVictim() {
    game.lynch.lynchesCompleted = (game.lynch.lynchesCompleted || 0) + 1;
    const completed = game.lynch.lynchesCompleted;
    game.lynch = { accusations: [], votes: {}, phase: 'idle', lynchesCompleted: completed };
    renderAccusations();
}

// ============================================================
// SPECIAL EVENTS
// ============================================================

function mayorElection() {
    alert("Mayor Election - placeholder for now.");
}

function anarchistAction() {
    const living = getLivingPlayers().map(p => p.name);
    if (living.length === 0) return;

    const victim = prompt("Anarchist kills who?\n" + living.join(", "));
    if (!victim) return;

    const killed = killPlayer(victim, "killed by Anarchist (day)");
    if (killed) {
        addNightEvent(`${victim} was killed by the Anarchist.`);
        alert(`${victim} is dead.`);
        renderLastNightSummary();
        renderAccusations();
    }
}

function terroristDetonate() {
    const targets = game.firstNight.bombTargets || [];
    if (targets.length === 0) {
        alert("No bomb was planted.");
        return;
    }

    const confirmMsg = `Detonate the bomb on ${targets.join(", ")}?`;
    if (!confirm(confirmMsg)) return;

    targets.forEach((name, idx) => {
        const cause = idx === 0 ? "killed by Terrorist bomb (primary)" : "killed by Terrorist bomb (blast)";
        killPlayer(name, cause);
    });

    addNightEvent(`The Terrorist detonated the bomb.`);
    alert("Bomb detonated. Victims are dead.");

    // Clear bomb
    game.firstNight.bombTargets = [];
    game.firstNight.bombSkipped = true;

    renderLastNightSummary();
    renderAccusations();
}
