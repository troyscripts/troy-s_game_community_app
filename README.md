# Troy’s Game Community Bot — 2.6.0

Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

**Voor het eerst gedownload? Begin bij [INSTALLATIE.md](INSTALLATIE.md).** Daarin staan Discord-app aanmaken, hosting, `.env`, opstarten en optionele GroqCloud-AI stap voor stap.

[HANDLEIDING.md](HANDLEIDING.md) bevat de slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.6.0 — Bump-herinneringen

Stel een kanaal in met `/config instellen instelling:Bump.Channel waarde:#bump`. De bot stuurt daar iedere twee uur een herinnering om `/bump` te gebruiken. De eerste herinnering volgt direct bij activeren. Uitschakelen kan met dezelfde instelling en waarde `uit`. De planning wordt per server opgeslagen en blijft na een herstart bewaard.

Update vanaf 2.5.9: stop de bot, plaats de gewijzigde bestanden en herstart. Nieuwe dependencies zijn niet nodig. Je serverinstellingen blijven behouden.

## Nieuw in 2.5.9 — Uitgebreide polls

Maak polls met `/poll maken`, 2–10 antwoorden gescheiden door `|`, een looptijd in minuten en optioneel meerdere keuzes per persoon. Staff beheert polls via `/poll wijzigen`, `/poll stoppen` en `/poll annuleren`, met het Poll-ID onder het bericht.

Vraag of antwoorden wijzigen wist bestaande stemmen; alleen de timer wijzigen behoudt ze. Polls en stemmen blijven na een herstart bewaard. Zie [HANDLEIDING.md](HANDLEIDING.md) voor voorbeelden en rechten.

Update vanaf 2.5.8: stop de bot, maak een databaseback-up, plaats de gewijzigde bestanden en herstart. Geen nieuwe dependencies nodig. De polltabel en slashcommando’s worden automatisch bijgewerkt. Oude polls met emoji-reacties worden niet omgezet.

## Nieuw in 2.5.8 — Handleiding via Discord

Gebruik `/help` om `HANDLEIDING.md` als bijlage in het huidige kanaal te ontvangen, samen met de supportlink. Het antwoord is openbaar. De bot moet berichten kunnen verzenden en bestanden kunnen bijvoegen.

Na het plaatsen van update 2.5.8: herstart de bot. Het nieuwe commando wordt bij het opstarten automatisch geregistreerd.

## Nieuw in 2.5.7

Vroege interactiebevestiging voor acht economy-commando’s en verbeterde centrale foutafhandeling. Wachttijd- en foutmeldingen blijven privé. Bij een mislukte eerste bevestiging worden geen economy-wijzigingen uitgevoerd.

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

Stop de bot, maak een back-up en kopieer de bestanden uit het updatepakket naar dezelfde paden in de botmap. Start daarna opnieuw. Voor 2.5.7 zijn geen nieuwe dependencies of slashcommandregistraties nodig; neem de nieuwe helper `utils/deferredReply.js` mee. Voor de Groq-update naar 2.5.6 zijn geen nieuwe dependencies of slashcommandregistraties nodig. Voeg voor AI je eigen GROQ_API_KEY en GROQ_MODEL toe aan je bestaande .env; zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md). De automatische changelog gebruikt de bestaande logginginstellingen.

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
