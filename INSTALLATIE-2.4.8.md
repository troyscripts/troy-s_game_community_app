# Persoonlijke update 2.4.8 — alleen Troy’s Game Community

Stop de bot, maak een backup en pak deze update uit in /home/container.
Voeg de mappen samen en herstart. Er zijn geen nieuwe dependencies nodig.
Je bestaande config/defaults.js, .env en database worden NIET meegeleverd of vervangen.
Gebruik jouw persoonlijke defaults-bestand uit de eerdere Troy-instellingen-versie.

config/settingsSource.js is al ingesteld op Troy’s Game Community:
DefaultsGuildId: "1414952603090944123"
Dit server-ID komt uit de servergegevens in de oorspronkelijke botzip.

Alleen deze server leest zijn serverinstellingen rechtstreeks uit config/defaults.js.
Opgeslagen database-instellingen worden voor deze server genegeerd en blijven bewaard.
Andere servers blijven hun eigen database-instellingen gebruiken.
/config bekijken en exporteren tonen de actieve bestandsinstellingen.
/config instellen, herstellen en resetten werken hier niet: wijzig defaults.js en herstart.
Bestaande staffrolkeuzemenu’s kunnen de database-instellingen van deze server niet wijzigen.

Dit kan ook eerder via Discord aangezette functies uitzetten wanneer ze in defaults.js
uitstaan. Controleer bijvoorbeeld Tickets.Enabled, AIChat.Enabled en AIChat.Channels.
De opstartmelding volgt StartupReport.Enabled en StartupReport.Channel uit defaults.js.

XP, economy, gebruikers, verjaardagen, tickets, selfrolpanelen en andere botdata
blijven in de database staan. Dit schakelt de database zelf niet uit.

Terugschakelen: zet DefaultsGuildId op "" in config/settingsSource.js en herstart.
De eerder opgeslagen serverinstellingen worden dan weer actief; er wordt niets gewist.

De persoonlijke server-ID niet openbaar uploaden. Maak DefaultsGuildId leeg voor
GitHub-publicatie. De bestaande exportcontrole weigert persoonlijke IDs bewust.
De automatische changelog van 2.4.8 gebruikt nu Logging.Channel uit defaults.js.

Gecontroleerd met een tijdelijke in-memory database: serverafscheiding, uitlezen,
blokkeren van wijzigingen, migratiebehoud en terugschakelen. Geen live Discord-test.
