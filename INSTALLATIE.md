# Installatiehandleiding — Troy’s Game Community Bot

Deze handleiding is voor iedereen die de bot downloadt en onder een eigen Discord-applicatie wil draaien. Geschikt voor versie 2.5.6. Je hebt geen programmeerkennis nodig, maar wel toegang tot het bestandbeheer en de startinstellingen van je hosting.

## 1. Wat heb je nodig?

- Een Discord-account en een server waarop je apps mag toevoegen.
- De volledige botbestanden, inclusief `package.json` en `package-lock.json`. Een ZIP met alleen updatebestanden is geen volledige installatie.
- Een Node.js-host met blijvende opslag. Gebruik Node.js 24 LTS. De bot moet kunnen schrijven in zijn eigen map voor de database, logs en back-ups.
- Je eigen Discord-bottoken. Voor AI gebruik je daarnaast je eigen GroqCloud-account en API-sleutel.

De Discord-bot blijft op jouw hosting draaien. GroqCloud verzorgt alleen de AI; daarvoor hoef je geen eigen AI-pc, Ollama of GPU-server aan te houden. AI is optioneel: zonder Groq-sleutel kun je de overige botfuncties gebruiken.

## 2. Maak je eigen Discord-applicatie

1. Open het [Discord Developer Portal](https://discord.com/developers/applications) en maak een **New Application** aan.
2. Kies een naam. Kopieer bij **General Information** de **Application ID**; die wordt straks `CLIENT_ID`.
3. Open **Bot**. Maak via **Reset Token** een bottoken aan; dit wordt `TOKEN`. Als je een bestaande bot gebruikt, hoef je het token niet opnieuw te maken zolang je het nog hebt.
4. Zet bij **Privileged Gateway Intents** **Server Members Intent** en **Message Content Intent** aan. De code vraagt deze aan. Presence Intent is voor deze bot niet nodig. Voor apps waarvoor Discord goedkeuring vereist, moet je die eerst aanvragen.
5. Gebruik onder **Installation** een **Guild Install** met de scopes `bot` en `applications.commands`. Open de installatielink en voeg de bot aan je server toe.

Deze bot gebruikt de Discord Gateway: er is geen eigen Interactions Endpoint URL nodig.

### Rechten en rolvolgorde

Geef de bot kanaaltoegang en de rechten voor de functies die je gebruikt:

| Functie | Rechten van de bot |
| --- | --- |
| Gewone antwoorden, embeds en bestanden | Kanalen bekijken, Berichten verzenden, Berichtgeschiedenis lezen, Links insluiten, Bestanden bijvoegen |
| Reacties, bijvoorbeeld bij het tellen | Reacties toevoegen |
| Tickets en staffthreads | Kanalen beheren, Privéthreads maken, Threads beheren, Berichten verzenden in threads |
| Selfrollen, verjaardagen, verificatie en levelrollen | Rollen beheren |
| Berichten opruimen | Berichten beheren |
| Moderatie | Leden verwijderen, Leden verbannen en/of Leden modereren, afhankelijk van de gebruikte commands |

Zet de botrol boven de rollen die de bot moet uitdelen of verwijderen. Controleer ook de rechten in afzonderlijke kanalen en categorieën. Geef leden toegang tot toepassingscommands in de kanalen waarin zij de bot mogen gebruiken.

## 3. Download en plaats de bestanden

Download de volledige broncode van de [GitHub-repository](https://github.com/troyscripts/troy-s_game_community_app), bijvoorbeeld via **Code → Download ZIP**, en pak deze uit.

Upload de inhoud van de botmap naar je hosting. `index.js`, `package.json`, `package-lock.json` en de mappen `commands`, `config`, `database`, `events`, `handlers`, `services` en `utils` horen op hetzelfde niveau te staan. Let op dat je niet per ongeluk een extra maplaag uploadt.

Heb je een nieuwere update-ZIP gekregen dan de volledige broncode? Plaats die daarna over de volledige installatie, op dezelfde bestandspaden.

Upload geen bestaande `node_modules` van je Windows-pc naar een Linux-host. De hosting installeert de passende dependencies zelf.

## 4. Vul je eigen .env in

Maak een kopie van `.env.example` en noem die **`.env`** in de hoofdmap. Let erop dat het bestand niet `.env.txt` heet. Zet verborgen bestanden zichtbaar als je het voorbeeld niet ziet.

Dit zijn de basisvelden; vul je eigen waarden in zonder de voorbeeldtekst te laten staan:

```env
TOKEN=JOUW_DISCORD_BOTTOKEN
CLIENT_ID=JOUW_APPLICATION_ID
GUILD_ID=JOUW_DISCORD_SERVER_ID
OWNER_IDS=JOUW_DISCORD_GEBRUIKERS_ID
DEVELOPER_IDS=
VIP_ROLE_IDS=
MESSAGE_CONTENT_INTENT=true

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b

GITHUB_REPOSITORY=
UPDATE_CHECK_ENABLED=true
```

| Veld | Betekenis |
| --- | --- |
| `TOKEN` | Het token van jouw eigen bot uit het Developer Portal. Gebruik exact deze naam, niet `DISCORD_TOKEN`. |
| `CLIENT_ID` | De Application ID van dezelfde Discord-applicatie. |
| `GUILD_ID` | De server-ID voor de eerste commandregistratie bij een lege database. Later gebruikt registratie de bekende servers uit de database. |
| `OWNER_IDS` | Jouw persoonlijke Discord-gebruikers-ID. Meerdere IDs scheid je met komma’s; dit zijn geen rol-IDs. |
| `DEVELOPER_IDS` | Optionele gebruikers-IDs voor de controles die globale developers herkennen. Voor volledige initiële configuratietoegang zet je jezelf in `OWNER_IDS`. |
| `VIP_ROLE_IDS` | Optionele VIP-rol-IDs, gescheiden door komma’s. |
| `GROQ_API_KEY` | Alleen nodig voor AI. Iedere beheerder gebruikt een eigen sleutel. |
| `GROQ_MODEL` | Standaard `openai/gpt-oss-20b`. |
| `GITHUB_REPOSITORY` | Leeg laten om de meegeleverde updatebron te gebruiken. |

Voor het kopiëren van IDs kun je in Discord **Gebruikersinstellingen → Geavanceerd → Ontwikkelaarsmodus** aanzetten. Klik daarna met rechts op jezelf, een server, rol of kanaal en kopieer de passende ID.

Bewaar je echte `.env` privé en upload hem niet naar GitHub. Deel tokens ook niet in screenshots. Is een token openbaar geworden, vervang het bij de betreffende dienst en herstart de bot met het nieuwe token.

### Vaste botidentiteit in deze distributie

Deze versie bevat een vaste TroyScripts-eigenaar: Discord-gebruiker `709486570293559356`. De code geeft dit account toegang tot botbeheer, ook buiten `OWNER_IDS`. Dit is vastgelegd in `utils/botIdentity.js`. De status **Troy Scrips** komt uit hetzelfde bestand en is niet via Discord of `.env` aanpasbaar. Discords eigen kanaalrechten en rolhiërarchie blijven van toepassing. Houd hier rekening mee wanneer je deze broncode onder een eigen botaccount installeert.

## 5. Installeer en start

Voer in de map met `package.json` achtereenvolgens uit:

```bash
npm ci
npm run deploy
npm start
```

- `npm ci` installeert de dependencies uit het lockbestand.
- `npm run deploy` registreert de slashcommands. Zorg dat `TOKEN`, `CLIENT_ID` en bij een nieuwe installatie `GUILD_ID` zijn ingevuld en dat de bot al lid is van de server.
- `npm start` start de bot. Op een gewone terminal blijft de bot alleen draaien zolang het proces actief blijft.

### Bij een hostingpaneel

Kies een Node.js-server met versie 24 LTS. Laat de installatiestap `npm ci` uitvoeren en gebruik **`npm start`** als startcommand. Vraagt je paneel alleen naar een startbestand, gebruik dan **`index.js`**.

Een draaiende botconsole is niet altijd een shell waarin je npm-commands kunt invoeren. Gebruik daarvoor de installatie-/terminalfunctie van je hosting. Als handmatig registreren vóór de eerste start niet lukt, start de bot eenmaal; voer daarna via een echte terminal `npm run deploy` uit. Vraag zo nodig je host hoe je eenmalig een npm-command uitvoert.

Er is geen aparte MySQL-server nodig: deze bot gebruikt SQLite. Kies blijvende opslag, zodat je database bij een herstart of nieuwe container bewaard blijft.

## 6. Eerste instellingen in Discord

Controleer met `/ping` of de bot antwoordt. Bekijk vervolgens je instellingen:

```text
/config bekijken
```

De servereigenaar en gebruikers in `OWNER_IDS` kunnen de eerste configuratie doen. De bot herkent daarnaast de ingestelde Owner-/Developer-rollen voor configuratiebeheer. Alleen een gewone Administrator-rol is niet automatisch voldoende voor `/config`.

Voorbeelden; vervang de kanaal-IDs door die van jouw server:

```text
/config instellen instelling:Logging.Channel waarde:123456789012345678
/config instellen instelling:Logging.Enabled waarde:ja
/config instellen instelling:Welcome.Channel waarde:123456789012345678
/config instellen instelling:Welcome.Enabled waarde:ja
```

Kies daarna via `/welkomstbericht instellen` je welkomsttekst. De volledige uitleg van tickets, rollen, economy en andere functies staat in [HANDLEIDING.md](HANDLEIDING.md).

Instellingen worden per Discord-server opgeslagen in de database. Het aanpassen van `config/defaults.js` overschrijft bestaande serverinstellingen niet. Gebruik voor die instellingen `/config`.

## 7. Optioneel: gratis AI via GroqCloud

1. Maak een eigen account bij [GroqCloud](https://console.groq.com/).
2. Maak via [API Keys](https://console.groq.com/keys) een sleutel aan.
3. Blijf op het gratis abonnement als je geen API-kosten wilt. De bot kan je Groq-abonnement niet controleren of afdwingen.
4. Vul in je bestaande `.env` in:

```env
GROQ_API_KEY=JOUW_EIGEN_GROQ_SLEUTEL
GROQ_MODEL=openai/gpt-oss-20b
```

5. Sla op en herstart de bot.
6. Stel in Discord een AI-kanaal in. Gebruik de ID van een tekstkanaal:

```text
/config instellen instelling:AIChat.Channels waarde:["123456789012345678"]
/config instellen instelling:AIChat.Mode waarde:mention
/config instellen instelling:AIChat.HistoryTurns waarde:2
/config instellen instelling:AIChat.Enabled waarde:ja
```

7. Vermeld in dat kanaal je bot en schrijf: **Hallo, kun je jezelf kort voorstellen?**

`mention` laat de AI alleen reageren wanneer je hem noemt. `all` laat hem op gewone tekstberichten reageren. Bij de eerste AI-aanvraag verschijnt de Groq-modelnaam in de console.

AI-berichten en beperkte gesprekshistorie met de bot worden door Groq verwerkt. Er worden geen oude kanaal- of ticketgesprekken opgehaald voor de AI. De gratis dienst heeft gebruikslimieten; bij een limiet pauzeert de bot tijdelijk. Er is geen automatische overstap naar een betaald abonnement. Zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md) voor details en foutmeldingen.

Wil je geen AI? Laat `GROQ_API_KEY` leeg en houd `AIChat.Enabled` op `nee`.

## 8. Optioneel: videomeldingen en livestreams

Voor YouTube-/TikTokmeldingen: [NOTIFY-HANDLEIDING.md](NOTIFY-HANDLEIDING.md). Voor Twitch: [TWITCH-HANDLEIDING.md](TWITCH-HANDLEIDING.md). Gebruik je eigen accounts, appgegevens, creators, kanalen en pingrollen; voorbeelden uit de documentatie zijn geen verplichte instellingen.

## 9. Bijwerken en back-ups

1. Stop de bot en maak een kopie van je bestaande installatie, inclusief `.env`, `database/database.sqlite` en eventuele bijbehorende SQLite-bestanden. Heb je zelf een ander databasepad ingesteld, bewaar dan dat pad.
2. Upload uitsluitend de bestanden van het bedoelde updatepakket naar dezelfde paden. Bewaar je eigen `.env` en database.
3. Voer `npm ci` uit als dependencies of het lockbestand gewijzigd zijn, en `npm run deploy` wanneer de update commands toevoegt of wijzigt.
4. Volg eventuele migratie- of verwijderinstructies van die update. Start daarna opnieuw en test `/ping` en de gewijzigde functies.

Voor de Groq-update 2.5.6 zijn geen nieuwe dependencies of slashcommands nodig. `.env.example` is een voorbeeld, geen vervanging voor jouw `.env`.

De bot heeft standaard automatische databaseback-ups in `database/backups`. Bewaar daarnaast zelf een kopie buiten je hosting. De versiechecker meldt updates, maar installeert ze niet. Automatische changelogmeldingen gebruiken `Logging.Enabled` en `Logging.Channel`.

## 10. Problemen oplossen

| Probleem | Controleer dit |
| --- | --- |
| `TOKEN ontbreekt` | Bestaat `.env` naast `index.js`, heet het echt `.env` en staat er `TOKEN=` met jouw bottoken? |
| Ongeldig token | Gebruik het bottoken van dezelfde applicatie als `CLIENT_ID`; sla wijzigingen op en herstart. |
| Disallowed intents / foutcode 4014 | Zet Server Members Intent en Message Content Intent aan bij Bot in het Developer Portal; controleer eventuele vereiste goedkeuring. |
| Slashcommands ontbreken | Controleer serverlidmaatschap, installatiescopes en `GUILD_ID`; voer `npm run deploy` uit. Controleer ook Discords commandrechten. |
| Geen toegang tot `/config` | Gebruik de servereigenaar of zet je eigen gebruikers-ID in `OWNER_IDS` en herstart. |
| `Missing Access` / `Missing Permissions` | Controleer kanaalrechten, categorie-overrides, commandrechten en de positie van de botrol. |
| AI antwoordt niet | Controleer `AIChat.Enabled`, de kanaallijst, `Mode`, de botvermelding, Message Content Intent, kanaalrechten en eventuele cooldown. |
| `AI_CONFIG` / `AI_AUTH` | Controleer `GROQ_API_KEY` en toegang tot het model; herstart na het aanpassen van `.env`. |
| `AI_RATE_LIMIT` | Wacht op herstel van je Groq-limiet. Berichten tijdens de pauze worden niet later automatisch beantwoord. |
| `GROQ_HTTP_400` / `GROQ_HTTP_404` | Controleer `GROQ_MODEL` en of het model beschikbaar is in je Groq-account. |
| `better-sqlite3` of native-modulefout | Gebruik Node.js 24 op de host en installeer daar opnieuw met `npm ci`; gebruik geen `node_modules` van een ander besturingssysteem. Vraag de host om ondersteuning als compilatie nodig is. |
| Gegevens weg na herstart | Controleer blijvende opslag en het databasepad; herstel een eigen databaseback-up terwijl de bot gestopt is. |

Stuur bij een hulpvraag de foutmelding, botversie en Node.js-versie mee. Laat tokens en persoonlijke gegevens weg.

## Bronnen

- [Discord-app aanmaken en installeren](https://docs.discord.com/developers/quick-start/getting-started)
- [Discord Gateway en intents](https://docs.discord.com/developers/events/gateway)
- [Node.js-versies](https://nodejs.org/en/about/previous-releases)
- [Groq API-limieten](https://console.groq.com/docs/rate-limits)

De instructies zijn gecontroleerd tegen de meegeleverde botcode. Een volledige installatie op jouw hosting en met jouw Discord-/Groq-account moet daar worden getest.
