function getAvailablePlayers(excludeSlotId) {
    const assigned = new Set(
        Object.entries(roleAssignments)
            .filter(([slotId]) => slotId !== excludeSlotId)
            .map(([, playerName]) => playerName)
    );

    return players.filter(p => !assigned.has(p));
}
