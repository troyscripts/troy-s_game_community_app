# Changelog

## 2.4.9A — 24 september 2026

### Discord Connection Monitor — diagnose-update

- Statusflapping rond 150 ms opgelost met hysterese: vanuit Normaal pas Verhoogd vanaf 175 ms en pas terug naar Normaal onder 150 ms.
- Ook de hogere statussen gebruiken aparte in- en uitschakelgrenzen om onnodig heen-en-weer schakelen te beperken.
- Gateway-reconnects loggen nu extra diagnosegegevens: actuele Gateway-ping, tijd sinds de vorige reconnect, event-loopvertraging, heap-/RSS-geheugen en botuptime.
- Gateway-disconnects loggen waar beschikbaar ook de WebSocket-closecode en reden.
- `/ping` blijft dezelfde compacte weergave gebruiken; de status volgt nu de gestabiliseerde monitorstatus.
- Geen database-, dependency- of configuratiewijziging nodig.
- Dit is diagnose-revisie **A** van 2.4.9; de npm/packageversie blijft bewust 2.4.9 zodat semver en de GitHub-versiechecker geldig blijven.

## 2.4.9 — 23 september 2026

### Discord Connection Monitor

- Nieuwe interne monitor meet elke 60 seconden de Discord Gateway/WebSocket-latency en bewaart maximaal 24 uur aan metingen in het geheugen.
- `/ping` toont nu botlatency, actuele Gateway-ping, gemiddelde, minimum, maximum, status, uptime, aantal metingen en Gateway-events.
- Verbindingsstatussen: normaal (<150 ms), verhoogd (150–249 ms), hoog (250–499 ms) en kritiek (500+ ms).
- Statuswijzigingen, disconnects, reconnects en hervatte Gateway-sessies worden in de bestaande logger vastgelegd zonder Discord-spam.
- Discord-clienttimeouts en clientfouten worden tijdens de huidige botsessie geteld.
- Geen nieuwe dependency, databasewijziging of configuratiewijziging nodig. Bestaande instellingen en database blijven behouden.
- Versie verhoogd naar 2.4.9; de bestaande automatische changelogmelding kan deze release na de update melden.

## 2.4.8 — 20 september 2026

- Per geselecteerde server instellingen rechtstreeks uit config/defaults.js gebruiken.
- Andere servers blijven hun eigen databaseconfiguratie gebruiken.
- Opgeslagen instellingen van de geselecteerde server blijven behouden voor terugschakelen.
- /config bekijken en exporteren tonen de actieve bestandsinstellingen; wijzigen en resetten verwijzen naar het bestand.
- XP, economy, tickets, selfrolpanelen en verjaardagen blijven in de database.

# Changelog

## 2.4.7 — 20 september 2026

- GitHub-versiechecker bij opstarten en elke zes uur, met updatelink in de console.
- .env.example, .gitignore en instructies voor installatie en publicatie toegevoegd.
- Vaste Discord-ID’s en persoonlijke YouTube-link uit openbare bestanden verwijderd.
- Globale owners, developers en VIP-rollen instelbaar via de lokale .env.
- Aparte GitHub-export zonder .env, databases, logs, transcripts of backups.
- Herstelscript accepteert een server-ID als argument.
- Versie uit package.json; automatische changelogmelding blijft behouden.

# Changelog

## 2.4.6 — 16 september 2026

### Selfrollen volledig instellen vanuit Discord

- Nieuw `/selfrollen`: meerdere benoemde panelen per server, met een eigen titel en meerregelige Markdown-tekst via een formulier.
- Per paneel maximaal 25 rolknoppen; rollen aanklikbaar in slashcommands, eigen label, kleur en optionele emoji. Een tweede klik verwijdert de rol.
- Panelen meerdere keren plaatsen, ook in verschillende kanalen. Tekst- en knopwijzigingen worden naar alle geregistreerde exemplaren gesynchroniseerd.
- Bestaande standaard-selfrolberichten van deze bot vervangen met `/selfrollen plaatsen` en het bericht-ID. Oude niet-vervangen panelen blijven werken.
- Knoppen afzonderlijk verwijderen, privévoorbeeld, paneellijst, opnieuw synchroniseren en paneel verwijderen met bevestiging.
- Beheer door bestaande Owner-/Developer-toegang of Discord Administrator. Rechten worden opnieuw gecontroleerd bij formulieren en acties.
- Controle op botrechten en rolhiërarchie; beheerde rollen, @everyone en staff-/beheerrollen worden geweigerd, ook bij latere klikken.
- Servergebonden opslag in nieuwe SQLite-tabellen; bestaande instellingen, XP, saldi en ledenrollen blijven behouden.
- Auditregistratie van wijzigingen, plaatsingen, vervangingen, verwijderingen, fouten en daadwerkelijk toegevoegde/verwijderde rollen. Audit blijft in SQLite bewaard; Discord-embeds volgen Logging.Enabled en Logging.Channel en bestandslogs volgen Logging.Files.
- Ontbrekende berichten worden uit de registratie verwijderd. Onbereikbare berichten worden gemeld en kunnen met `verversen` opnieuw worden bijgewerkt. Verwijderde panelen en knoppen kunnen geen rollen meer uitdelen.
- Versie naar 2.4.6 in packagebestanden, defaults, banner en AI-startmelding. De bestaande automatische changelogmelding meldt deze nieuwe versie na opstarten.
- Nieuwe slashcommand registreren met `npm run deploy`; geen nieuwe dependencies en geen databasebestand vervangen.

## 2.4.5 — 16 september 2026

### Automatische changelogmelding (aanvulling op 2.4.5)

- Bij opstarten controleert de bot per server of de actieve versie afwijkt van de laatst succesvol gemelde versie.
- Plaatst het bijpassende versiehoofdstuk in een embed met de volledige CHANGELOG.md als bijlage in Logging.Channel, als Logging.Enabled aanstaat.
- Slaat pas na succesvolle verzending de versie op in de bestaande SQLite scheduler_state. Een normale herstart met dezelfde versie verstuurt geen herhaling.
- Eerste installatie van deze functie meldt ook de huidige 2.4.5. Een latere versie of terugkeer naar een eerdere versie geeft weer een melding.
- Mislukte verzending, ontbrekend versiehoofdstuk en later ingesteld logkanaal worden iedere vijf minuten opnieuw gecontroleerd. Een fout in één server blokkeert de overige servers niet.
- Versie volgt config.Version (de bestaande banner); package.json dient als fallback. Houd beide versievermeldingen gelijk bij releases.

### Dubbele beloningen

- VIP-rol (instelbaar via VIP_ROLE_IDS) en de per server ingestelde Birthday.Role geven 2× verdiende XP en economiegeld.
- Geldt voor chat-XP, XP bij goed tellen, ingehaalde XP bij opstarten, /daily en /work. Beide rollen tegelijk blijven 2×.
- Geen bonus op /give, betalingen, facturen, gestolen geld, bankverplaatsingen, startsaldo of handmatige XP-/levelwijzigingen. Diefstal verplaatst geld van een ander en creëert geen extra geld.
- Cooldowns en bestaande saldi/XP blijven behouden; alleen nieuwe beloningen worden verdubbeld. /daily en /work tonen de bonus en het werkelijk ontvangen bedrag.
- VIP-rollen configureerbaar in config/rewardBonuses.js. De verjaardagsrol volgt automatisch Birthday.Role per server.
- Bij opstartscan worden huidige rollen gebruikt: historische roltoekenningen zijn niet beschikbaar. Als een lid niet opgehaald kan worden geldt de basisbeloning met een waarschuwing.

### Verjaardagen

- Standaardtijd naar 00:00, met Europe/Amsterdam als bestaande standaardtijdzone. Opgeslagen servertijden blijven leidend en moeten via /config naar 00:00 worden gezet.
- Ledenlijst wordt opgehaald na herstart/dagwisseling en periodiek vernieuwd, zodat ook niet-gecachete leden worden gecontroleerd.
- Oude verjaardagsrollen worden onafhankelijk van de dagelijkse berichtstatus verwijderd; fouten worden gelogd en opnieuw geprobeerd.
- Rollen gelden voor de verjaardagskalenderdag tot de volgende middernacht. Dagelijkse berichtstatus blijft behouden; succesvolle nieuwe berichten worden ook per lid onthouden voor herpogingen.

### AI op hosting

- Beveiligde externe Ollama-verbinding via OLLAMA_BASE_URL en OLLAMA_BRIDGE_TOKEN; HTTPS en sleutel vereist buiten localhost.
- Losse Windows AI-bridge met begrensde chatroute, vaste lokale modelkeuze en sleutelcontrole. Tailscale Funnel-installatie beschreven.
- Bereikbaarheidscontrole, Nederlandse offline-melding en hervatten bij nieuwe vragen zodra pc/Ollama weer beschikbaar zijn.
- Geen extra betaalde AI-API of npm-dependency toegevoegd.

### Release en controles

- Eigen botversie in package.json, package-lock.json, defaults, bannerfallback en AI-melding naar 2.4.5; dependencyversies ongewijzigd.
- Installatiescripttoestemming voor de reeds gebruikte better-sqlite3@12.11.1 opgenomen, zodat de hostingfix behouden blijft.
- Geen database-reset of nieuwe tabellen. AI- en verjaardagsupdates uit dit gesprek zijn de reeds geïnstalleerde basis; dit updatepakket herhaalt die fixes niet (aiChat.js bevat alleen de gewijzigde versiemelding).
- Lokale gerichte tests: alle vier rolcombinaties op vijf beloningsroutes, geldbedragen in embeds, economy-cooldowns, servergebonden verjaardagsrol; daarnaast eerdere AI-bridge- en verjaardagstests. Geen live Discord-/hostingtest van release 2.4.5.

## 2.4.0 — 11 september 2026

Deze release bundelt de ticketupgrade en alle daaropvolgende 2.3.5-aanpassingen en reparaties.

### Nieuw

- Per onderwerp een eigen Discord-doelcategorie binnen één ticketpaneel, via een privé-instelscherm voor de maker. Maximaal tien onderwerpen met minimumstaffrollen.
- Privéstaffthread per nieuw ticket met Staffoverleg-knop en controle op tickettoegang.
- Automatisch HTML-transcript naar de ticketmaker via DM bij sluiten/rechtstreeks verwijderen, met lokale kopie en indien mogelijk een logkopie. Staffoverleg wordt uitgesloten.
- Ticketnaam ticket-nummer-onderwerp-eigenaar; standaard vijf open tickets per gebruiker per server.
- Roles.Developer: servergebonden ownerrechten, inclusief configuratiebeheer en staffrollenkeuze.
- StaffRoles via aanklikbare rollenkeuze bij /config instellen zonder waarde.
- /bot-avatar instellen, bekijken en herstellen: aparte botprofielfoto per server en opslag van de afbeelding in SQLite.

### Gerepareerd

- Ontbrekende staff_thread_id/staff_roles_json/transcript_dm_sent_at worden door de ticketmodule zelf toegevoegd, ook als een eerdere installatie gedeeltelijk was bijgewerkt.
- Owner/Developer/Administrator met kanaaltoegang kan ook bij een eigen ticket het staffoverleg openen; gewone ticketmakers blijven uitgesloten.
- Ownerherkenning centraal voor staffknoppen, ticketcommands, moderatie, XP-beheer en ticketpaneelinstellingen.
- Avatarupload accepteert reguliere en tijdelijke Discord-commandobijlagen. Onjuiste hosts, ongeschikte bestandsformaten en te grote downloads worden geweigerd.
- Export-/schrijffouten voorkomen ticketverwijdering; DM-fouten worden gemeld met behoud van de lokale kopie. Een succesvolle eerdere DM wordt bij verwijderen niet dubbel verstuurd.

### Release en documentatie

- Eigen botversie in package.json, package-lock.json, defaults, bannerfallback en AI-modulemelding naar 2.4.0.
- Nieuwe installatiehandleiding voor Windows en Node-hosting; advies Node.js 24 LTS en correcte uitleg over eerste start en automatische commandregistratie.
- Handleiding en overzicht vernieuwd voor 48 hoofdcommands en 75 vaste wijzigbare instellingen.
- Geen dependency-upgrade, database-reset of wijziging van schema-/API-/bibliotheekversienummers.
- Lokale syntax-, migratie-, permissie-, paneel-, transcript- en avatartests uitgevoerd. Geen volledige live Discord-/hosting-/Ollama-test.

## 2.3.5 — ontwikkelreeks

Ticketuitbreidingen en tussentijdse reparaties ontwikkeld en aangeboden vóór 2.4.0. De volledige functionele opsomming staat hierboven. Oude losse 2.3.5-patches zijn niet meer nodig bij installatie van de volledige 2.4.0-release.

## [2.3.0] — 6 september 2026 — Stabiel

Deze release bundelt de door de beheerder als stabiel aangeleverde 2.2.5 met de onderstaande uitbreidingen en reparaties. In de release-afwerking zijn versievermeldingen en documentatie bijgewerkt; de bestaande functies en afhankelijkheidsversies blijven behouden.

### Automatische registratie en meerdere servers

- Slashcommands worden automatisch geregistreerd zodra de bot een server betreedt.
- Bij opstarten controleert de bot alle servers waar hij lid van is, ook servers die tijdens downtime zijn toegevoegd.
- Gewijzigde lokale commanddefinities en ontbrekende commandnamen worden bijgewerkt; succesvolle registraties worden per bot/server in SQLite onthouden.
- Registratie gebeurt achter elkaar. Een fout bij één server blokkeert de overige registraties niet; opnieuw proberen gebeurt bij een volgende start.
- De configuratieprovider is beschermd tegen recursieve aanroepen vanuit bijvoorbeeld de logger. Ongeldige JSON wordt als waarschuwing zichtbaar in plaats van een eindeloze kringloop. Beschadigde opgeslagen JSON moet afzonderlijk worden hersteld.

### Tickets

- Tot 10 zelfgekozen categorieën per ticketpaneel.
- Een minimumstaffrol per categorie via `minimumrol1` t/m `minimumrol10`.
- De minimumrol en hogere rollen uit `StaffRoles` worden geselecteerd op basis van de actuele Discord-rolvolgorde, voor toegang en vermelding.
- Panelen en hun keuzes blijven bewaard in SQLite; bestaande tickets worden niet achteraf aangepast.
- `discord-html-transcripts` blijft exact op 3.2.0 staan wegens de eerder gemelde React-mismatch met 3.3.0.
- Transcriptknop controleert het logkanaal, voorkomt gelijktijdige dubbele aanvragen en meldt pas succes na het versturen van het HTML-bestand.

### Economie en lokale AI

- `/stelen` met slagingskans, bedragenlimieten, compensatie bij mislukken en blijvende cooldown.
- `/rekening` voor versturen, overzichten, bekijken, betalen, weigeren en annuleren. Betalen vereist een actie van de ontvanger.
- Lokale Ollama-chat met `qwen2.5:3b` als standaard, korte Nederlandse antwoorden en tijdelijk gespreksgeheugen.
- Verbeterde meldingen bij model-, verbindings- en antwoordfouten en filtering van herkenbare denkuitvoer.
- Geen betaalde AI-fallback; `OLLAMA_MODEL` blijft instelbaar via `.env`.

### Logging en privéantwoorden

- Embeds voor verwijderde berichten, interacties, nieuwe leden en vertrekkende leden.
- Interactielogs bevatten geen formulierinhoud, commandinvoer of privéantwoorden.
- Verouderde `ephemeral: true`-antwoordopties vervangen door `flags: MessageFlags.Ephemeral`.

### Documentatie en releasebestanden

- Botversie op 2.3.0 in defaults, pakketmetadata, lockmetadata, bannerfallback en AI-modulemelding.
- README, AI-installatie, reparatieoverzicht en volledige command-/instellingenhandleiding bijgewerkt.
- `.env.example` afgestemd op het huidige standaardmodel.
- Broncodepakket zonder `node_modules`, databases, herstelkopieën of servergebonden eenmalig herstelscript.
- Bestaande opgeslagen instellingen en gebruikersgegevens worden door deze versie-update niet gewijzigd.

### Controle van deze release

- Node-syntaxcontrole en projectvalidator uitgevoerd; resultaat staat in `REPARATIES.md`.
- Pakketversie, lockversie en configuratieversie gecontroleerd op 2.3.0.
- Afhankelijkheidsdefinities en vergrendelde pakketversies behouden ten opzichte van de aangeleverde ZIP.
- Geen nieuwe Discord-login, live transcriptgeneratie of echt Ollama-model uitgevoerd tijdens de release-afwerking.

---

## Archief tot en met 2.2.5

Onderstaande vermeldingen beschrijven eerdere tussenversies. Oude modelkeuzes, aantallen en handmatige installatiestappen zijn historisch; gebruik voor 2.3.0 de README en de nieuwe commandhandleiding.

# Lokale Ollama-editie — 2.2.5

- AI-chat gebruikt nu uitsluitend Ollama op dezelfde pc via 127.0.0.1:11434.
- Geen OpenAI-API-sleutel, betaalde fallback of nieuwe npm-afhankelijkheden.
- Standaard lokaal model qwen3:4b, instelbaar via OLLAMA_MODEL in .env.
- Eén AI-aanvraag tegelijk om lokale belasting te beperken; time-out 120 seconden voor modelstart.
- Bestaande kanaalinstellingen, gespreksgeheugen, counting en XP blijven behouden.
- Windows-installatie en foutoplossing toegevoegd aan AI-CHAT-INSTALLATIE.md.
- Botversie op verzoek gecorrigeerd naar 2.2.5.

## Eerdere wijzigingen (historisch)

# Release 2.1.5 — 5 september 2026

- Versie op uitdrukkelijk verzoek ingesteld op 2.1.5, ook al heette de aangeleverde basis 2.2.0.
- AI-chat toegevoegd: inhoudelijke Nederlandse antwoorden met kort gespreksgeheugen per gebruiker en kanaal.
- Kanalen, modus, persoonlijkheid en wachttijd via het bestaande eigenaar-command /config.
- Counting uitgesloten; AI werkt ook als XP uitstaat. Geen AI-antwoorden op de historische opstartscan.
- Time-out, begrensd geheugen, gelijktijdigheidslimiet en foutafhandeling toegevoegd.
- Geen extra npm-afhankelijkheden. Bestaande data en overige functies behouden.
- Zie AI-CHAT-INSTALLATIE.md voor activeren en testen.

## Historisch changelog van de aangeleverde basis

# Changelog

In dit bestand worden de belangrijkste wijzigingen aan Troy's Gamecommunity Bot
bijgehouden.

## [2.2.0] - 3 september 2026

### Stabiele multi-serverrelease

- De botversie is verhoogd van `2.1.5` naar `2.2.0`.
- De volledige serverconfiguratie is met `/config` vanuit Discord te beheren.
- Alleen de daadwerkelijke eigenaar van de betreffende Discord-server kan de
  configuratie bekijken, wijzigen, herstellen, exporteren of resetten.
- Instellingen worden per `guild_id` in SQLite bewaard, zodat dezelfde gebruiker en
  dezelfde bot veilig in meerdere Discord-servers kunnen worden gebruikt.
- De bestaande instellingen van Troy's Game Community blijven behouden.
- Nieuwe Discord-servers krijgen een eigen configuratie met lege kanaal- en
  rol-ID's; instellingen worden nooit tussen servers overgenomen.
- Guild-ID's worden automatisch vanuit Discord en alle SQLite-tabellen met een
  `guild_id`-kolom herkend. Een server die alleen in `users` voorkomt, wordt dus ook
  meegenomen.
- `npm run deploy` registreert alle slashcommands afzonderlijk in iedere herkende
  Discord-server; `GUILD_ID` blijft alleen als noodinstelling voor een lege eerste
  installatie beschikbaar.
- Alle servergebonden functies gebruiken tijdens de uitvoering de configuratie van
  de server waarin het event of command plaatsvindt.

### Controle

- 97 JavaScript-bestanden zijn geslaagd voor de Node-syntaxcontrole.
- 45 unieke slashcommands, inclusief `/config`, zijn gevonden.
- De hoofdserver en testserver zijn afzonderlijk herkend via hun eigen `guild_id`.
- Dezelfde gebruiker kan zonder conflict in beide servers in `users` staan.
- De definitieve zip en de SQLite-initialisatie zijn zonder fouten gecontroleerd.

### Bijwerken vanaf 2.1.5

Bewaar de bestaande `.env` en `database/database.sqlite` en vervang de overige
bestanden. Voer daarna uit:

```bash
npm ci
npm run check
npm run deploy
npm start
```

## [2.1.5] - 3 september 2026

### Aanvulling: Discord-configuratie

- Nieuw `/config`-command om serverinstellingen te bekijken, wijzigen, herstellen,
  exporteren of volledig te resetten.
- Alleen de daadwerkelijke eigenaar van de betreffende Discord-server kan het
  configuratiecommand gebruiken; Administrator- en staffrollen zijn niet voldoende.
- Instellingen worden per Discord-server als JSON in de bestaande SQLite-database
  opgeslagen.
- De reeds gebruikte Discord-server neemt bij de eerste start automatisch alle
  bestaande kanaal-, rol- en functie-instellingen over.
- Nieuwe Discord-servers beginnen met lege kanaal- en rol-ID's, zodat instellingen
  nooit tussen servers worden gedeeld.
- Guild-ID's worden bij het opstarten, in commands/events en bij het toevoegen van de
  bot aan een nieuwe server automatisch herkend en geregistreerd.
- `npm run deploy` leest de geregistreerde guild-ID's rechtstreeks uit SQLite en
  plaatst de slashcommands afzonderlijk in iedere opgeslagen Discord-server.
- De deploydetectie doorzoekt alle tabellen met een `guild_id`-kolom. Daardoor telt
  een testserver die al onder `users` staat ook mee wanneer `settings` nog ontbreekt.
- Verjaardagscontrole, opstartscan, opstartrapportage, rechten, tickets, counting,
  levels en embeds gebruiken direct de configuratie van de betreffende server.
- Globale en gevoelige waarden, waaronder `.env`, databasepad, owneraccounts en de
  botversie, zijn niet via Discord wijzigbaar.
- Het versienummer is op verzoek ongewijzigd gebleven op `2.1.5`.

### Toegevoegd

- Een nieuw owner-only `/agenda`-command voor de planning van het YouTube-kanaal.
- `/agenda toevoegen` om een video, stream of andere activiteit met datum, tijd en
  optionele beschrijving aan de planning toe te voegen.
- `/agenda verwijderen` om een agendapunt via het bijbehorende ID te verwijderen.
- `/agenda tonen` om de YouTube-planning in ieder gekozen tekst- of
  aankondigingskanaal te plaatsen.
- `/agenda lijst` om privé alle agendapunten en beheer-ID's te bekijken.
- Blijvende SQLite-opslag voor agendapunten en geplaatste agendaberichten.
- Automatische updates van eerder geplaatste agenda's wanneer een agendapunt wordt
  toegevoegd of verwijderd.
- Een klikbare verwijzing en embedtitel naar het officiële
  het ingestelde YouTube-kanaal.
- De actuele botversie in de embed van de bot-opstartcontrole.
- Een veilig `.env.example`-bestand zonder tokens of andere geheime gegevens.

### Gewijzigd

- De botversie is overal gelijkgezet op `2.1.5`.
- De ownercontrole accepteert zowel de ingestelde `Roles.Owner`-rol als accounts
  uit de `Owners`-lijst.
- Het databaseschema is verhoogd naar versie 4 en wordt bij de eerste start
  automatisch uitgebreid met de YouTube-agendatabellen.
- De agenda gebruikt standaard de tijdzone `Europe/Amsterdam` en toont tijden via
  de lokale Discord-tijdweergave van de gebruiker.
- Per kanaal wordt één vast agendabericht bijgehouden om dubbele agenda-embeds te
  voorkomen.

### Controle

- 93 JavaScript-bestanden zijn geslaagd voor de Node-syntaxcontrole.
- 44 unieke slashcommands zijn gevonden.
- De ownerrol, agenda-opbouw, YouTube-link en botversie in de opstartembed zijn
  afzonderlijk gecontroleerd.
- De definitieve zip is zonder archieffouten gecontroleerd.

### Na installatie

Voer na het vervangen van de bestanden de volgende opdrachten uit:

```bash
npm ci
npm run check
npm run deploy
npm start
```

`npm run deploy` is nodig om de commands, waaronder `/agenda` en `/config`, bij
Discord te registreren.
