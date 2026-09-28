# Troy’s Game Community Bot — 2.5.1

Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

[HANDLEIDING.md](HANDLEIDING.md) bevat de slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.5.1

- Iedere Discord-server is weer instelbaar met `/config instellen`. De vaste-configmodus is verwijderd.
- `/reset-voortgang bevestigen:Ja` reset XP/levels en economy van alle bestaande profielen in deze server. Zie de handleiding voor de precieze werking.

## Nieuwe installatie

1. Gebruik Node.js 20 of hoger.
2. Kopieer `.env.example` naar `.env` en vul je eigen Discord-botgegevens in.
3. Installeer de dependencies met `npm ci`.
4. Vul voor een eerste installatie ook `GUILD_ID` in `.env` in en registreer de slashcommando’s met `npm run deploy`. De bot moet al aan die server zijn toegevoegd.
5. Start de bot met `npm start`.
6. Stel de server in via `/config`. De servereigenaar en ingestelde owners/developers hebben toegang.

Voor welkomstberichten stel je `Welcome.Enabled` in op `ja` en `Welcome.Channel` op het gewenste kanaal. Gebruik daarna `/welkomstbericht instellen`. De bot heeft toegang tot dat kanaal nodig, inclusief Berichten verzenden en Links insluiten. Schakel de benodigde Discord-intents in overeenkomstig je botinstellingen; zie ook de opstartcontrole van de bot.

## Bestaande installatie bijwerken

Stop de bot en maak een back-up van je database. Kopieer alle bestanden uit het updatepakket naar dezelfde paden in de botmap. Behoud je eigen `.env`, database en `config/defaults.js`.

Verwijder `config/settingsSource.js` en `INSTALLATIE-2.4.8.md`; de volledige lijst staat in `VERWIJDERDE-BESTANDEN.txt`. Start de bot opnieuw. Het nieuwe slashcommand wordt automatisch geregistreerd; bij een registratiefout kun je `npm run deploy` gebruiken. Er zijn geen nieuwe dependencies.

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
