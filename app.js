// ============================================================
// SCREEN MANAGEMENT
// ============================================================

function showScreen(screenId) {
    document.querySelectorAll("div[id^='screen']").forEach(s => s.style.display = "none");
    const target = document.getElementById(screenId);
    if (target) target.style.display = "block";
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", function() {
    try {
        buildRoleSelectUI();
        showScreen("screenSetup");

        // Ensure roster button is hidden until game starts
        const rosterBtn = document.getElementById("rosterToggleBtn");
        if (rosterBtn) rosterBtn.style.display = "none";
    } catch (e) {
        console.error("Init error:", e);
        alert("Error loading app: " + e.message);
    }
});

console.log("app.js loaded");