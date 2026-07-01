// Wakeup order for standard nights (Night 2+).
// Alchemist and Poltergeist are first IF it's their first night since death.
// All others wake in this fixed order.
const WAKEUP_ORDER = [
    { roleKey: 'roleAlchemist',   label: 'Alchemist',     conditional: 'firstNightAfterDeath', individuals: false },
    { roleKey: 'rolePoltergeist', label: 'Poltergeist',   conditional: 'firstNightAfterDeath', individuals: false },
    { roleKey: 'roleBarman',      label: 'Barman',        conditional: null,                   individuals: false },
    { roleKey: 'roleBus',         label: 'Bus Driver',    conditional: null,                   individuals: false },
    { roleKey: 'roleDefender',    label: 'Defender',      conditional: null,                   individuals: false },
    { roleKey: 'roleMirror',      label: 'Mirror',        conditional: null,                   individuals: false },
    { roleKey: 'roleDetective',   label: 'Detective',     conditional: null,                   individuals: false },
    { roleKey: 'roleVigilante',   label: 'Vigilantes',    conditional: null,                   individuals: true  },
    { roleKey: 'roleMafia',       label: 'Mafia Members', conditional: null,                   individuals: 'adjustable' },
    { roleKey: 'roleBoss',        label: 'Mafia Boss',    conditional: null,                   individuals: false },
    { roleKey: 'roleDoctor',      label: 'Doctor',        conditional: null,                   individuals: false },
    { roleKey: 'roleSerial',      label: 'Serial Killer', conditional: 'everyOtherNight',      individuals: false },
    { roleKey: 'roleJokester',    label: 'Jokester',      conditional: null,                   individuals: false },
];

const ROLES = {
    ///////////////////////////////////////TOWN ALIGNED
    roleCitizen: {
        displayName: "Citizen",
        alignment: "Town",
        description: "Town-aligned. Has no special abilities.",
        cap: Infinity,
    },
    roleDetective: {
        displayName: "Detective",
        alignment: "Town",
        description: "Town-aligned. Active during the night. Investigates the townsfolk to uncover mafia ties.",
        cap: 1,
        nightAction: {
            type: 'investigate',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleDefender: {
        displayName: "Defender",
        alignment: "Town",
        description: "Town-aligned. Active during the night. May choose a person to protect from death.",
        cap: 1,
        nightAction: {
            type: 'protect',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleDoctor: {
        displayName: "Doctor",
        alignment: "Town",
        description: "Town-aligned. Active during the night. May choose to save the Mafia's victim, once per game. May also choose to kill someone by poisoning, once per game.",
        cap: 1,
        nightAction: {
            type: 'save',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleVigilante: {
        displayName: "Vigilante",
        alignment: "Town",
        description: "Town-aligned. Active during the night. May kill at their own discretion, but cannot deal with the guilt of killing an ally.",
        cap: 2,
        nightAction: {
            type: 'kill',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleWatcher: {
        displayName: "Watcher",
        alignment: "Town",
        description: "Town-aligned. May discreetly watch the Mafia in the night, at grave personal risk.",
        cap: 1,
        nightAction: {
            type: 'watch',
            targetPool: 'none',
            minTargets: 0,
            maxTargets: 0,
            skippable: false,
            isPassive: true,
        }
    },
    roleHunter: {
        displayName: "Hunter",
        alignment: "Town",
        description: "Town-aligned. Upon being killed, may take out one other person with them.",
        cap: 1,
    },
    roleMirror: {
        displayName: "Mirror",
        alignment: "Town",
        description: "Town-aligned. Active during the night. Will reflect the first attack that hits them onto another player, after which the Mirror shatters and becomes a Citizen.",
        cap: 1,
        nightAction: {
            type: 'reflect',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleFreemason: {
        displayName: "Freemason",
        alignment: "Town",
        description: "Town-aligned. All Freemasons wake up together on the first night to be aware of each other.",
        cap: 10,
        firstNight: { type: 'teamReveal', teamWake: true },
    },
    roleBus: {
        displayName: "Bus Driver",
        alignment: "Town",
        description: "Town-aligned. Active during the night. Picks two players for the night where all actions targeting one will be redirected to the other, and vice versa.",
        cap: 1,
        nightAction: {
            type: 'redirect',
            targetPool: 'livingOther',
            minTargets: 2,
            maxTargets: 2,
            skippable: true,
        }
    },
    rolePriest: {
        displayName: "Priest",
        alignment: "Town",
        description: "Town-aligned. Cannot vote in lynches. When killed, their killer is converted and becomes a Citizen.",
        cap: 1,
    },
    roleLucky: {
        displayName: "Lucky Citizen",
        alignment: "Town",
        description: "Town-aligned. When lynched for the first time, the rope snaps and they are saved from death, becoming a Citizen.",
        cap: 1,
    },
    roleNobleman: {
        displayName: "Nobleman",
        alignment: "Town",
        description: "Town-aligned. When lynched for the first time, if the Mayor approves of this, they may choose another player to be executed in their place.",
        cap: 1,
    },
    roleAlchemist: {
        displayName: "Alchemist",
        alignment: "Town",
        description: "Town-aligned. When killed for the first time, wakes up on the next night and chooses one player. When this player dies, the Alchemist is resurrected and re-enters the game.",
        cap: 1,
        nightAction: {
            type: 'markResurrection',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
            conditional: 'firstNightAfterDeath',
        }
    },
    roleRabble: {
        displayName: "Rabble Rouser",
        alignment: "Town",
        description: "Town-aligned. While they are alive, the town may lynch an additional time each day.",
        cap: 1,
    },
    roleJokester: {
        displayName: "Jokester",
        alignment: "Town",
        description: "Town-aligned. Active in the night. May choose one other player to perform a random, pointless task for the next day. This role is purely for fun.",
        cap: 1,
        nightAction: {
            type: 'task',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },

    ///////////////////////////////////////MAFIA ALIGNED
    roleMafia: {
        displayName: "Mafia Member",
        alignment: "Mafia",
        description: "Mafia-aligned. Active in the night. Kills at their own discretion.",
        cap: Infinity,
        firstNight: { type: 'teamReveal', teamWake: true },
        nightAction: {
            type: 'kill',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: false,
        }
    },
    roleBoss: {
        displayName: "Mafia Boss",
        alignment: "Mafia",
        description: "Mafia-aligned. Active in the night. May choose a person to blind, mute, or paralyze for the following day. If all regular Mafia Members are dead, the Boss assumes their ability to kill.",
        cap: 1,
        nightAction: {
            type: 'debuff',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },
    roleBarman: {
        displayName: "Barman",
        alignment: "Mafia",
        description: "Mafia-aligned. Active in the night. Chooses one person to role-block for the night. Cannot kill.",
        cap: 1,
        nightAction: {
            type: 'block',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
        }
    },

    ///////////////////////////////////////INDEPENDENTS
    roleAnarchist: {
        displayName: "Anarchist",
        alignment: "Independent",
        description: "Independent. At any point during the day, once per game, may kill one other player at their own discretion.",
        cap: 1,
        specialAction: { type: 'dayKill', uses: 1 },
    },
    roleTerrorist: {
        displayName: "Terrorist",
        alignment: "Independent",
        description: "Independent. On the first night, plants a bomb on one player, which they may then detonate at any point during the day, killing the chosen player and the two players either side of them.",
        cap: 1,
        firstNight: { type: 'plantBomb' },
        specialAction: { type: 'detonate', uses: 1 },
    },
    roleSerial: {
        displayName: "Serial Killer",
        alignment: "Independent",
        description: "Independent. Active every other night. Kills at their own discretion.",
        cap: 1,
        nightAction: {
            type: 'kill',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: false,
            conditional: 'everyOtherNight',
        }
    },
    roleSuicidal: {
        displayName: "Suicidal",
        alignment: "Independent",
        description: "Independent. Wins if lynched.",
        cap: 1,
    },
    roleSurvivor: {
        displayName: "Survivor",
        alignment: "Independent",
        description: "Independent. Wins if alive at game end.",
        cap: 1,
    },
    rolePoltergeist: {
        displayName: "Poltergeist",
        alignment: "Independent",
        description: "Independent. When killed, wakes up on the next night and chooses one player to possess, learning their role, taking on their alignment, and taking over all of their role's actions.",
        cap: 1,
        nightAction: {
            type: 'possess',
            targetPool: 'livingOther',
            minTargets: 1,
            maxTargets: 1,
            skippable: true,
            conditional: 'firstNightAfterDeath',
        }
    },
};
