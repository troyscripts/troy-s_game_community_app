# Troy’s Game Community Bot — 2.5.6

Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

**Voor het eerst gedownload? Begin bij [INSTALLATIE.md](INSTALLATIE.md).** Daarin staan Discord-app aanmaken, hosting, `.env`, opstarten en optionele GroqCloud-AI stap voor stap.

[HANDLEIDING.md](HANDLEIDING.md) bevat de slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.5.6

AI-chat werkt nu via GroqCloud, zonder eigen AI-host. Zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md) voor installatie en testen.

## Nieuw in 2.5.5

De vaste boteigenaar heeft in elke server toegang tot botbeheer, onafhankelijk van rollen en de ownerlijst. De botstatus is vastgezet op **Troy Scrips** en kan niet via Discord of .env worden aangepast. Wie de broncode beheert, kan die code uiteraard wijzigen. Discord-kanaalrechten, commandoverschrijvingen en de rechten/rolhiërarchie van de bot blijven gelden.

## Nieuw in 2.5.4

Twitch-livemeldingen via `/notify`, met kanaalkeuze en pingrollen voor iedere streamer. Zie [TWITCH-HANDLEIDING.md](TWITCH-HANDLEIDING.md) voor appgegevens en het instellen van troyenrobin.

## Nieuw in 2.5.3

Robuustere YouTube- en GitHub-controles met veilige doorverwijzingen, een extra poging bij tijdelijke netwerkfouten en concrete foutcodes. Dezelfde YouTube-creator wordt per controleronde eenmaal opgehaald. Notify meldt herstel na fouten. De correcties voor de YouTube-cookiepagina, kanaal-ID’s zonder UC-prefix en de loggerfout in de versiechecker zijn inbegrepen.

## Nieuw in 2.5.2

Automatische YouTube- en TikTok-videomeldingen met `/notify`: vier instelbare pingrollen, een kanaal per creatoraccount, meerdere creators per server en beheer door Head Admin, Owner en Developer. TikTok vereist eenmalig accounttoestemming. Zie [NOTIFY-HANDLEIDING.md](NOTIFY-HANDLEIDING.md).

## Nieuwe installatie

1. Volg [INSTALLATIE.md](INSTALLATIE.md) en gebruik Node.js 24 LTS.
2. Kopieer `.env.example` naar `.env` en vul je eigen Discord-botgegevens in.
3. Installeer de dependencies met `npm ci`.
4. Vul voor een eerste installatie ook `GUILD_ID` in `.env` in en registreer de slashcommando’s met `npm run deploy`. De bot moet al aan die server zijn toegevoegd.
5. Start de bot met `npm start`.
6. Stel de server in via `/config`. De servereigenaar en ingestelde owners/developers hebben toegang.

Voor welkomstberichten stel je `Welcome.Enabled` in op `ja` en `Welcome.Channel` op het gewenste kanaal. Gebruik daarna `/welkomstbericht instellen`. De bot heeft toegang tot dat kanaal nodig, inclusief Berichten verzenden en Links insluiten. Schakel de benodigde Discord-intents in overeenkomstig je botinstellingen; zie ook de opstartcontrole van de bot.

## Bestaande installatie bijwerken

Stop de bot, maak een back-up en kopieer de bestanden uit het updatepakket naar dezelfde paden in de botmap. Start daarna opnieuw. Voor de Groq-update naar 2.5.6 zijn geen nieuwe dependencies of slashcommandregistraties nodig. Voeg voor AI je eigen GROQ_API_KEY en GROQ_MODEL toe aan je bestaande .env; zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md). De automatische changelog gebruikt de bestaande logginginstellingen.

## Instellingen en gegevens

Iedere server gebruikt zijn opgeslagen databaseconfiguratie. Je eerder via Discord ingestelde waarden worden dus weer actief. Controleer ze met `/config bekijken` en pas ze aan met `/config instellen`. Waarden die je alleen in defaults wijzigde, worden niet over een bestaande databaseconfiguratie heen gekopieerd.

`config/defaults.js` blijft nodig voor basiswaarden en globale instellingen, zoals owners, databasepad en botstatus. Verwijder dit bestand niet. Serverinstellingen worden via Discord opgeslagen; de oude bestandsmodus bestaat niet meer.

XP en economy worden pas gewist wanneer je het resetcommand met bevestiging uitvoert. De update zelf reset geen voortgang.

## Updates en GitHub

De versiechecker gebruikt `package.json` en de repository in `config/updates.js`:
https://github.com/troyscripts/troy-s_game_community_app

De bot controleert bij opstarten en iedere zes uur op een nieuwere stabiele Latest-release. Updates worden niet automatisch geïnstalleerd. De automatische Discord-changelog gebruikt `Logging.Enabled` en `Logging.Channel` en verstuurt iedere versie eenmaal nadat afleveren is gelukt.

Publicatie-instructies staan in [GITHUB-INSTALLATIE.md](GITHUB-INSTALLATIE.md).

## Controles

- `npm run check`: controle van syntax, commandnamen en vereiste bestanden.
- `npm run test:updates`: tests voor de versiechecker.
- `npm run prepare:github`: maak een openbare export zonder lokale botdata.

Deze broncode is lokaal gecontroleerd. Er is geen live Discord-test uitgevoerd.
