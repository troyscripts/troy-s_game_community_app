# Troy’s Game Community Bot — 2.4.7

Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen,
counting, YouTube-agenda en optionele AI-chat via Ollama. Instellingen en gegevens
worden per Discord-server in SQLite opgeslagen.

## Installatie

1. Gebruik Node.js 24 en voer `npm ci` uit in deze map.
2. Kopieer `.env.example` naar `.env`. Vul `TOKEN` en `CLIENT_ID` in.
3. Schakel in het Discord Developer Portal **Server Members Intent** en
   **Message Content Intent** in. Zonder berichtinhoud kun je
   `MESSAGE_CONTENT_INTENT=false` instellen, maar berichtafhankelijke functies
   zoals counting en AI-chat werken dan beperkt of niet.
4. Nodig de bot uit met scopes `bot` en `applications.commands`. Geef de rechten
   die jouw functies nodig hebben: kanalen lezen, berichten/embeds/bijlagen
   verzenden, geschiedenis lezen, rollen beheren, en voor tickets kanalen en
   threads beheren. Voor moderatie zijn de bijbehorende moderatierechten nodig.
   Zet de botrol boven de rollen die hij moet beheren.
5. Start met `npm start`. Commands registreren automatisch in de aangesloten
   servers. De database en benodigde gegevensmappen worden aangemaakt.
6. Stel als servereigenaar via `/config hulp` en `/config instellen` je kanalen
   en rollen in. De openbare standaardconfiguratie bevat geen eigen Discord-ID’s.

Voorbeelden:

```text
/config instellen instelling:Logging.Channel waarde:JOUW_LOGKANAAL_ID
/config instellen instelling:Birthday.Role waarde:JOUW_VERJAARDAGSROL_ID
/config instellen instelling:Birthday.Channel waarde:JOUW_VERJAARDAGSKANAAL_ID
/config instellen instelling:Counting.Channel waarde:JOUW_TELKANAAL_ID
```

Globale botbeheerders staan als gebruikers-ID’s in `OWNER_IDS` en
`DEVELOPER_IDS` in `.env`; VIP-rol-ID’s in `VIP_ROLE_IDS`. Scheid meerdere ID’s
met komma’s. De servereigenaar kan zijn server ook zonder globale owner instellen.
De verjaardagsbonus gebruikt `Birthday.Role`. Bonussen stapelen niet.

AI-chat staat standaard uit. Stel lokaal Ollama in via `.env` en configureer
`AIChat.Enabled` en `AIChat.Channels` in Discord. Een externe verbinding vereist
een eigen compatibele HTTPS-bridge met `/health` en `/api/chat` plus een gedeelde
sleutel; die bridge zit niet in dit project.

## Updates en GitHub

Vul de openbare repositorylink in `config/updates.js` bij `Repository` in.
De checker controleert bij opstarten en iedere zes uur de Latest-release en
meldt een nieuwere stabiele versie met downloadlink in de console. Hij installeert
niets automatisch. Zonder link blijft de controle uit. Geen GitHub-token nodig.

De bestaande changelogfunctie meldt de geïnstalleerde versie per server in
`Logging.Channel` wanneer logging is ingeschakeld. Dit is een andere melding dan
de GitHub-updatecontrole. Nieuwe versiehoofdstukken staan in [CHANGELOG.md](CHANGELOG.md).

Lees [GITHUB-INSTALLATIE.md](GITHUB-INSTALLATIE.md) vóór bijwerken of publiceren.
Gebruik `npm run prepare:github` om een aparte publicatiemap te maken.
Upload nooit je draaiende botmap, database of `.env` rechtstreeks.

## Controle en beheer

- `npm run check`: syntax, commandnamen en vereiste bestanden.
- `npm run test:updates`: offline tests voor de GitHub-versiechecker.
- `npm run deploy`: optioneel handmatig commands registreren.
- `node herstel-serverconfig.cjs JOUW_SERVER_ID`: herstel uitsluitend overtollige
  komma’s in opgeslagen serverconfiguratie, met databasebackup; stop de bot eerst.
- [UPGRADE-2.4.6.md](UPGRADE-2.4.6.md): bediening van selfrolpanelen.
- [INSTALLATIE-CHANGELOG.md](INSTALLATIE-CHANGELOG.md): automatische changelogmeldingen.

Bewaar `.env` en je database bij updates. Er is geen hergebruiklicentie gekozen;
een openbare repository betekent op zichzelf geen toestemming voor vrij hergebruik.
