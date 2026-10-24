// Openbare basisinstellingen. Persoonlijke instellingen staan in .env en de database.
// Het versienummer en de database-instellingen blijven globale botinstellingen.
module.exports = {
    Debug: false,
    Prefix: "!",
    Version: require("../package.json").version,

    Bot: {
        Language: "both", // nl, en of both; openbare botberichten
        Name: "Troy's Gamecommunity",
        Color: "#c9a91b",
        Footer: "Troy's Gamecommunity Discord",
        Status: {
            Text: require("../utils/botIdentity").statusText,
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

    // Vier herbruikbare pingrollen; per Discord-server instelbaar via /config.
    Notify: {
        PingRole1: "",
        PingRole2: "",
        PingRole3: "",
        PingRole4: ""
    },

    // Een kanaal instellen via /config activeert de herinnering iedere twee uur.
    Bump: { Channel: "" },

    // Aparte tijdelijke VIP-rol voor de economywinkel; per server via /config.
    Store: { VIPRole: "" },

    // Internetradio: per server instelbaar via /config; zenders ook via /radio instellen.
    Radio: {
        Enabled: true, // true = starten toegestaan; false = geen nieuwe starts/volumewijzigingen
        DefaultVolume: 30, // 0–100 procent; bij iedere start of zenderwissel
        EmptySeconds: 60, // 5–3600 seconden wachten nadat de laatste menselijke luisteraar vertrekt
        Stations: {
            // Name: zichtbare naam (max. 80 tekens). Url: directe HTTP(S) MP3/AAC-stream.
            // Lege Url schakelt het zendernummer uit. Geen website, YouTube-link of M3U/PLS.
            Station1: { Name: "Radio 538", Url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538.mp3" },
            Station2: { Name: "538 Non Stop", Url: "https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR09.mp3" },
            Station3: { Name: "538 Dance Department", Url: "https://playerservices.streamtheworld.com/api/livestream-redirect/TLPSTR01.mp3" },
            Station4: { Name: "Qmusic", Url: "https://stream.qmusic.nl/qmusic/mp3" },
            Station5: { Name: "Qmusic Nonstop", Url: "https://stream.qmusic.nl/nonstop/mp3" },
            Station6: { Name: "Qmusic Thema", Url: "https://stream.qmusic.nl/thema/mp3" },
            Station7: { Name: "Qmusic Top 40", Url: "https://stream.qmusic.nl/top40/mp3" },
            Station8: { Name: "Qmusic Nederlandstalig", Url: "https://stream.qmusic.nl/nederlandstalig/mp3" },
            Station9: { Name: "Qmusic 90s & 00s", Url: "https://stream.qmusic.nl/90s-00s/mp3" },
            Station10: { Name: "NPO Radio 5", Url: "https://icecast.omroep.nl/radio5-bb-mp3" },
            Station11: { Name: "NPO Klassiek", Url: "https://icecast.omroep.nl/radio4-bb-mp3" },
            Station12: { Name: "Radio Veronica", Url: "https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICA.mp3" },
            Station13: { Name: "", Url: "" },
            Station14: { Name: "", Url: "" },
            Station15: { Name: "", Url: "" },
            Station16: { Name: "", Url: "" },
            Station17: { Name: "", Url: "" },
            Station18: { Name: "", Url: "" },
            Station19: { Name: "", Url: "" },
            Station20: { Name: "", Url: "" },
            Station21: { Name: "", Url: "" },
            Station22: { Name: "", Url: "" },
            Station23: { Name: "", Url: "" },
            Station24: { Name: "", Url: "" },
            Station25: { Name: "", Url: "" }
        }
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
        Language: "nl", // Discord-logberichten: nl, en of both
        Enabled: true,
        Console: true,
        Files: true,
        MessageDelete: true,
        Channel: "", // standaard; lege categoriekanalen gebruiken dit kanaal
        RetentionDays: 30,
        MaxRecords: 50000,
        QueueLimit: 5000,
        Channels: {Messages: "", MessageEdits: "", MessageDeletes: "", Reactions: "", Members: "", Roles: "", Channels: "", Threads: "", Voice: "", Moderation: "", Invites: "", Server: "", Expressions: "", ScheduledEvents: "", Integrations: "", AutoMod: "", Commands: "", Audit: "", Presence: "", Typing: "", Polls: ""},
        Events: {Messages: true, MessageEdits: true, MessageDeletes: true, Reactions: true, Members: true, Roles: true, Channels: true, Threads: true, Voice: true, Moderation: true, Invites: true, Server: true, Expressions: true, ScheduledEvents: true, Integrations: true, AutoMod: true, Commands: true, Audit: true, Presence: true, Typing: true, Polls: true}
    },

    SoftModeration: {
        Enabled: false,
        LogChannel: "",
        TimeoutHours: 24,
        RepeatWindowHours: 24,
        MinConfidence: 0.9,
        AdultContent: true, // expliciet seksuele inhoud: verwijderen + geregistreerde warn
        AdultMinConfidence: 0.95,
        ScanImages: true,
        VisionModel: "qwen/qwen3.8-27b",
        SpamMessages: 6,
        SpamWindowSeconds: 10,
        MentionLimit: 6,
        QueueLimit: 200
    },

    Honeypot: {
        Enabled: false,
        Channel: "",
        Action: "ban", // ban of timeout (7 dagen)
        CrossServerBan: false, // deelnemen aan serveroverstijgende honeypot-bans en time-outs
        LogChannel: "", // leeg = Logging.Channel
        Mention: "verified" // verified, none, everyone, here of een rol-ID
    },

    Tickets: {
        Enabled: false,
        Transcript: true,
        AutoClose: false,
        Category: "",
        LogChannel: "",
        ThreadLogChannel: "", // apart staff-only kanaal voor threadtranscripten
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
        AutoRole: "",
        Message: "👋 Welkom {gebruiker} bij **{server}**!\n\n**Aantal leden:** {ledenaantal}\nLees eerst de regels en verifieer jezelf om toegang te krijgen."
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
