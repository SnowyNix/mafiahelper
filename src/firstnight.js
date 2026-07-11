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

    showDayScreen();
}

function goBackToWhosWho() {
    // Hide roster when going back
    hideRoster();
    const rosterBtn = document.getElementById("rosterToggleBtn");
    if (rosterBtn) rosterBtn.style.display = "none";

    showScreen("screenWhosWho");
}
