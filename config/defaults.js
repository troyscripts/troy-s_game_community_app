// Openbare basisinstellingen. Persoonlijke instellingen staan in .env en de database.
// Het versienummer en de database-instellingen blijven globale botinstellingen.
module.exports = {
    Debug: false,
    Prefix: "!",
    Version: require("../package.json").version,

    Bot: {
        Name: "Troy's Gamecommunity",
        Color: "#c9a91b",
        Footer: "Troy's Gamecommunity Discord",
        Status: {
            Text: "Troy's Gamecommunity",
            Type: "WATCHING"
        }
    },

    // Globale Discord-gebruikers-ID's. Deze zijn bewust niet via Discord wijzigbaar.
    Owners: (process.env.OWNER_IDS || "").split(",").map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id)),
    Developers: (process.env.DEVELOPER_IDS || "").split(",").map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id)),

    Roles: {
        Developer: "",
        Owner: "",
        HeadAdmin: "",
        Admin: "",
        HeadModerator: "",
        Moderator: "",
        Verified: "",
        NewUser: ""
    },

    StaffRoles: [],

    SelfRoles: { fivem: "", ats: "", minecraft: "", streams: "" },

    Database: {
        Type: "sqlite",
        File: "database/database.sqlite",
        Backup: true,
        BackupIntervalHours: 24
    },

    Logging: {
        Enabled: true,
        Console: true,
        Files: true,
        MessageDelete: true,
        Channel: ""
    },

    Tickets: {
        Enabled: false,
        Transcript: true,
        AutoClose: false,
        Category: "",
        LogChannel: "",
        MaxOpenPerUser: 5
    },

    Levels: {
        Enabled: true,
        XPMin: 5,
        XPMax: 14,
        Cooldown: 60,
        AnnounceLevelUp: true,
        Roles: {
            0: "",
            3: "",
            10: "",
            20: "",
            30: ""
        }
    },

    Economy: {
        Enabled: true,
        StartingMoney: 500,
        DailyCooldownHours: 24,
        WorkCooldownMinutes: 60
    },

    AIChat: {
        Enabled: false,
        Channels: [],
        Mode: "all",
        CooldownSeconds: 10,
        HistoryTurns: 4,
        Personality: "Je houdt van gaming en een gezellige community. Gebruik af en toe een emoji."
    },

    Counting: {
        Enabled: true,
        Channel: "",
        RewardXP: 10,
        FeedbackDeleteSeconds: 30
    },

    Birthday: {
        Enabled: true,
        CheckTime: "00:00",
        Timezone: "Europe/Amsterdam",
        Role: "",
        Channel: "",
        Messages: [
            "Van harte gefeliciteerd met je verjaardag, {user}! 🎉🎂",
            "Vandaag zetten we {user} in het zonnetje. Gefeliciteerd! 🥳",
            "Een hele fijne verjaardag gewenst, {user}! 🎈"
        ]
    },

    Agenda: {
        Timezone: "Europe/Amsterdam",
        Title: "📅 YouTube-planning",
        YouTubeUrl: "",
        MaxVisibleItems: 80
    },

    Welcome: {
        Enabled: true,
        Channel: "",
        AutoRole: ""
    },

    Leave: { Enabled: true, Channel: "" },

    StartupMessageScan: {
        Enabled: true,
        InitialMessagesPerChannel: 100,
        MaxNewMessagesPerChannel: 1000,
        ProcessMissedXP: true,
        DelayMs: 150
    },

    StartupReport: { Enabled: true, Channel: "" }
};
