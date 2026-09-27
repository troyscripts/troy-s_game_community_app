# Troy’s Game Community Bot — 2.5.0

Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

[HANDLEIDING.md](HANDLEIDING.md) bevat de 50 slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.5.0

- `/welkomstbericht instellen`: wijzig de welkomsttekst voor deze server.
- `/welkomstbericht voorbeeld`: bekijk de invulvelden en de actieve tekst.
- Invulvelden: `{gebruiker}`, `{gebruikersnaam}`, `{server}`, `{ledenaantal}`, `{gebruikersid}` en `{serverid}`.
- Beide herstelupdates zijn inbegrepen: een ontbrekende tekst veroorzaakt geen fout en het toetredingsbericht haalt de opgeslagen tekst rechtstreeks voor de juiste server op.
- De versie blijft 2.5.0, inclusief de herstelupdates.

## Nieuwe installatie

1. Gebruik Node.js 20 of hoger.
2. Kopieer `.env.example` naar `.env` en vul je eigen Discord-botgegevens in.
3. Installeer de dependencies met `npm ci`.
4. Vul voor een eerste installatie ook `GUILD_ID` in `.env` in en registreer de slashcommando’s met `npm run deploy`. De bot moet al aan die server zijn toegevoegd.
5. Start de bot met `npm start`.
6. Stel de server in via `/config`. De servereigenaar en ingestelde owners/developers hebben toegang.

Voor welkomstberichten stel je `Welcome.Enabled` in op `ja` en `Welcome.Channel` op het gewenste kanaal. Gebruik daarna `/welkomstbericht instellen`. De bot heeft toegang tot dat kanaal nodig, inclusief Berichten verzenden en Links insluiten. Schakel de benodigde Discord-intents in overeenkomstig je botinstellingen; zie ook de opstartcontrole van de bot.

## Bestaande installatie bijwerken

Stop de bot en maak een back-up. Voeg de bronbestanden samen met de bestaande botmap. **Behoud je eigen `.env`, database en aangepaste configuratiebestanden, met name `config/defaults.js` en `config/settingsSource.js`.** De openbare bestanden hebben lege kanaal-/rol-ID’s en een lege `DefaultsGuildId`.

Deze versie werkt ook als `Welcome.Message` in je bestaande defaults ontbreekt. Neem de nieuwe JavaScript-bestanden van de welkomstfunctie allemaal over. Registreer nieuwe slashcommando’s met `npm run deploy` en start de bot opnieuw. Voor de stap van 2.4.9 naar 2.5.0 zijn geen nieuwe dependencies toegevoegd.

## Instellingen en gegevens

Standaard is `DefaultsGuildId` leeg en beheert iedere server de eigen instellingen via Discord. Wie één server vanuit `config/defaults.js` wil beheren, kan die server-ID lokaal invullen in `config/settingsSource.js`.

De welkomsttekst blijft ook dan via `/welkomstbericht instellen` wijzigbaar en heeft voorrang op de bestandstekst. `/welkomstbericht voorbeeld` toont de actieve tekst. `/config bekijken` en `/config exporteren` tonen in bestandsmodus de defaults-instellingen.

Instellingen, XP, economy, verjaardagen en tickets worden opgeslagen in de database. Verwijder deze niet bij een update.

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
