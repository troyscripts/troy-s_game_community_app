# Drie bots koppelen — versie 3.2.2

Alle drie de installaties gebruiken dezelfde code uit GitHub. Bot **1486317240319082597** is het centrale meldpunt. De andere twee ontvangen meldingen. Er is geen betaalde database nodig: de centrale wachtrij staat in de bestaande SQLite-database. Alleen Discord-gebruiker **709486570293559356** mag `/botbericht` uitvoeren. Een ontvangende installatie heeft geen netwerkfunctie waarmee zij nieuwe meldingen kan publiceren.

## 1. Maak eerst een back-up van iedere installatie

Stop iedere bot voordat je de bestanden kopieert. Bewaar per installatie:

- `.env`: bevat het eigen Discord-token en CLIENT_ID. Gebruik nooit het token van een andere kopie.
- De volledige database op het pad `Database.File` (standaard `database/database.sqlite`). Bewaar ook eventuele `-wal` en `-shm` bestanden als de bot niet netjes is gestopt.
- Je eigen `data/`-bestanden en eventueel aangepaste configuratiebestanden.
- Eigen transcripts, logs en back-ups als je die wilt bewaren.

**Alle code vervangen mag; de database en `.env` weggooien niet.** Zonder de database verdwijnen onder andere serverinstellingen en de economy. Zonder de centrale database verdwijnt ook de administratie van meldingen en afleveringen. Gebruik voor iedere bot zijn eigen database; kopieer de centrale database niet over de andere installaties.

## 2. Volledige bot vervangen

Pak de ZIP uit. Plaats de **inhoud** van `troy-s_game_community_app-main` in de map met `package.json`; maak geen extra maplaag. Vervang de code, herstel/behoud de eigen bestanden uit stap 1 en neem nieuwe opties uit `.env.example` over in de bestaande `.env`. Het voorbeeldbestand bevat geen echte tokens of gedeelde sleutel.

Voer `npm ci` uit met Node.js 22.12 of hoger (Node.js 24 aanbevolen voor je huidige hosting). De nieuwe koppeling voegt geen npm-dependencies toe. Laat de hosting de installatie uitvoeren als je paneel dat al doet. Gebruik `npm run deploy` om de slashcommands bij te werken en herstart. Bij het starten registreert de bot zijn commands ook via de bestaande opstartprocedure.

## 3. Extra poort en gedeelde sleutel

Wijs een extra bereikbare poort toe aan de **centrale** Pterodactyl-server. De andere twee hebben geen extra inkomende poort nodig. De hosting moet uitgaand verkeer naar de centrale poort toelaten. Dezelfde hosting betekent niet dat `localhost` naar de andere container verwijst.

Genereer één sleutel:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Kopieer diezelfde sleutel naar alle drie de `.env`-bestanden. Deel of commit de sleutel niet. `.env` is uitgesloten via `.gitignore`. Netwerkverzoeken en antwoorden zijn met AES-256-GCM versleuteld en geauthenticeerd, ook op een HTTP-allocation. HTTPS via een bestaande reverse proxy kan eveneens. Het IP-adres, tijdstip en verkeersvolume zijn daarmee niet verborgen. Houd je systeemtijden gelijk.

## 4. Waarden per installatie

| Instelling | Centrale bot | Ontvanger 1 en ontvanger 2 |
| --- | --- | --- |
| `TOKEN` / `CLIENT_ID` | Bestaande eigen waarden behouden | Bestaande eigen waarden behouden |
| `BROADCAST_ENABLED` | `true` | `true` |
| `BROADCAST_BOT_IDS` | De drie echte bot-ID's, kommagescheiden | Exact dezelfde drie ID's |
| `BROADCAST_SECRET` | Gegenereerde sleutel van 64 hextekens | Exact dezelfde sleutel |
| `BROADCAST_BIND` | `0.0.0.0` | Wordt niet gebruikt |
| `BROADCAST_PORT` | Toegewezen extra poort | Wordt niet gebruikt |
| `BROADCAST_URL` | Leeg | `http://HOSTING-IP:EXTRA-POORT` |
| `BROADCAST_POLL_SECONDS` | `15` | `15` |

Neem **1486317240319082597** altijd op in `BROADCAST_BOT_IDS`. Voeg de twee andere echte bot-ID's toe; niet jouw gebruikers-ID en niet de Discord-server-ID's. De centrale rol wordt afgeleid van het echte ingelogde bot-ID en kan niet via `/config` worden overgenomen.

Start eerst de centrale bot, daarna de twee ontvangers. Controleer de console op `Centraal meldpunt gestart` en `Ontvanger gestart` en wacht minimaal één ophaalinterval. Een startmelding alleen bewijst nog geen verbinding: controleer ook of er een synchronisatiefout verschijnt. De eerste publicatie wordt geblokkeerd zolang een bot uit de lijst nog nooit is geregistreerd.

## 5. Eén keer versturen

Gebruik op een server met de **centrale bot**:

```text
/botbericht bericht:Je mededeling voor alle aangesloten servers
```

Kies in Discord het command van de centrale bot als meerdere bots hetzelfde command hebben. Een ontvanger verwijst je naar de centrale bot; er wordt dan niets verstuurd. Je gebruikers-ID wordt zowel bij de commandafhandeling als bij het publiceren gecontroleerd.

Het antwoord toont het meldingsnummer en het aantal unieke doelservers in de wachtrij. **In de wachtrij betekent nog niet afgeleverd.** Elke bot logt per server de naam, het ID, het meldingsnummer en het resultaat in zijn console.

Alleen servers met een ingesteld `Logging.Channel` worden geregistreerd als bestemming. De registratie wordt iedere 15 seconden vernieuwd. Stel dit kanaal vooraf in via de bestaande `/config`-instellingen voor botlogging. `Logging.Enabled=false` verhindert deze handmatige eigenaarsmelding niet als er nog een kanaal is ingesteld.

De bestemmingenset wordt bij publicatie vastgelegd uit de laatst geregistreerde serverlijsten. Een bekende offline bot kan dus later zijn meldingen ophalen. Een nieuwe server die pas na publicatie wordt toegevoegd ontvangt die oude melding niet automatisch. Een server die door meerdere bots wordt beheerd krijgt één centrale reservering; de eerste bot met een ingesteld logkanaal voert die uit.

## Betrouwbaarheid en beperkingen

- Berichten blijven bewaard in de centrale database; offline ontvangers halen wachtende meldingen na terugkeer op. De centrale bot moet online zijn om nieuwe meldingen te publiceren of op te halen.
- Iedere melding en server heeft één centrale reservering. Een lokale afleverbevestiging wordt eerst opgeslagen, daarna centraal bevestigd. Een tijdelijke storing bij bevestigen veroorzaakt daardoor geen tweede Discord-bericht.
- Bij een crash precies tijdens het versturen of een onduidelijke Discord-netwerkfout kan niet bewezen worden of Discord het bericht al heeft geplaatst. Zo'n reservering wordt **niet automatisch opnieuw verstuurd**. Na herstel wordt die als `uncertain` gelogd. Controleer dan het kanaal en plaats een ontbrekend bericht gericht met `/say`. Absolute exactly-once-aflevering tussen SQLite en Discord is niet te garanderen.
- Een onbereikbaar kanaal of geweigerde verzending krijgt `failed`; een ontbrekend kanaal bij uitvoering krijgt `skipped`. Ook dan gericht herstellen; opnieuw `/botbericht` gebruiken maakt een **nieuwe** melding naar alle doelservers.
- Een server die wordt verlaten of waarvan alle gekoppelde logkanalen worden uitgezet, kan een openstaande melding houden totdat een ontvanger die bestemming weer aanbiedt.
- Wanneer de koppeling is ingeschakeld maar niet werkt, valt `/botbericht` niet stilzwijgend terug op alleen de lokale bot. Dat voorkomt dat je denkt dat alle twaalf servers zijn bereikt.
- Bij `BROADCAST_ENABLED=false` blijft het lokale gedrag van versie 3.2.1 beschikbaar. Zet daarom op **alle drie** `true` voor deze opstelling.

## Opstartcontrole

De bestaande opstartcontrole, kanaalscan en serveraantallen blijven per installatie werken. Vier servers op één bot blijven vier in die opstartmelding. De koppeling meldt apart of de installatie centraal meldpunt of ontvanger is. Een verbroken verbinding verhindert de andere opstartcontroles niet; de ontvanger probeert later opnieuw. Alleen het aantal bestemmingen bij een centrale `/botbericht`-publicatie wordt over alle geregistreerde bots samengevoegd en ontdubbeld.

## Problemen oplossen

| Melding / situatie | Controle |
| --- | --- |
| `EADDRINUSE` | De centrale poort is al bezet; gebruik een vrije allocation. |
| Geen verbinding / timeout | IP, poort, firewall en uitgaand verkeer; centrale bot moet online zijn. |
| Sleutel onjuist / HTTP 401 | Dezelfde 64 hextekens, juiste bot-ID-lijst en gelijke systeemtijd op alle drie. |
| Nog niet alle bots verbonden | Start/configureer de genoemde bot-ID's en wacht één ophaalinterval. |
| Command verwijst naar centrale bot | Selecteer `/botbericht` van bot 1486317240319082597. |
| Minder dan twaalf doelservers | Controleer per bot de ingestelde botlogkanalen; wacht op registratie. Overlappende servers tellen één keer. |
| `uncertain` of `failed` | Controleer het doelkanaal en botrechten; stuur zo nodig alleen daar met `/say`. |

## Controles in dit pakket

De syntaxis, versieconsistentie en gerichte tests voor rechten, wachtrij, reserveringen, herstartadministratie en beveiligd lokaal HTTP-verkeer zijn gecontroleerd. Geen live Discord-berichten verstuurd; je echte hosting-IP, allocation en tokens moeten na installatie worden getest.
