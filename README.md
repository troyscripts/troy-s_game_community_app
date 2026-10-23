# Troy’s Game Community Bot — 3.1.5

## Nieuw in 3.1.5: tickets zonder staffoverleg sluiten

Nieuwe tickets krijgen pas een privéthread wanneer staff **Staffoverleg** opent.
Zonder opgeslagen staffthread is geen `Tickets.ThreadLogChannel` vereist om te
sluiten. Een verwijderde opgeslagen staffthread wordt als ontbrekend vastgelegd
in het aparte stafflog en lokaal; daarna kan het ticketgesprek worden bewaard
en het ticket worden gesloten. Ontbrekende botrechten blijven een blokkade.
Zie `UPDATE-3.1.5.txt`. Er zijn geen nieuwe instellingen of slashcommands.


## Nieuw in 3.1.4: automatische controles

GitHub Actions controleert iedere push en pull request op Node.js 22 en 24: schone installatie, code/bestanden, versies, database/commandos en alle regressietests. Lokaal: `npm ci` gevolgd door `npm run ci`. Zie CONTROLES.md.

## Nieuw in 3.1.3: softmoderatie

Alle kanalen, uitzondering voor staffrollen, waarschuwing en 24 uur time-out bij herhaling. Staff kan beoordelen en een Nederlandse einddatum/tijd invoeren. Activeer per server volgens [SOFTMODERATIE.md](SOFTMODERATIE.md).

## Nieuw in 3.1.2: beveiligingsupdate

- Knoppen en formulieren: maximaal één actie tegelijk per gebruiker per server, met twee seconden wachttijd. Afgewezen herhaalklikken vullen het logkanaal niet.
- Sluiten, verwijderen en exporteren van tickets controleren opnieuw de stafftoegang en rang van de behandelaar. Lagere staff kan een ticket van hogere staff niet afhandelen. Bestaande Owner-, Developer-, Administrator- en vaste botowner-toegang blijven behouden.
- Transcriptverwerking: één export tegelijk voor de bot, maximaal 5000 berichten en 8 MB berichtgegevens per kanaal; HTML maximaal 8 MB. Geen ingebedde afbeeldingsdownloads. Bij overschrijding blijft het ticket behouden: geen stilzwijgend afgekapt archief. Een beheerder moet grote tickets volledig apart archiveren.
- Transcriptbibliotheek blijft op de werkende 3.2.0; onderliggende Undici vastgezet op 6.29.1 en overige getroffen dependencies bijgewerkt.
- Stop de bot, maak een back-up, vervang de updatebestanden, voer `npm ci` uit en herstart. Geen configuratiewijziging of commandoregistratie nodig. Zie `UPDATE-3.1.2.txt`.

## Nieuw in 3.1.1: ticketmeldingen en ledenlijst-fix

Een ontbrekend of gelijk ingesteld `Tickets.ThreadLogChannel` geeft nu een duidelijke privémelding met het instelcommando, in plaats van een foutstack bij iedere klik. Het ticket blijft behouden totdat het staffoverleg veilig is gearchiveerd.

```text
/config instellen instelling:Tickets.ThreadLogChannel waarde:#ticket-thread-logs
```

Kies een apart staff-only tekstkanaal, verschillend van `Tickets.LogChannel`, het ticket en de staffthread. Geef de bot toegang, Berichten verzenden en Bestanden bijvoegen. Dit blijft verplicht voor tickets met een staffthread; de update kiest geen kanaal namens jou.

Claimen en toegang wijzigen halen de volledige ledenlijst nu gepagineerd via de REST-API op, zonder gateway-opcode 8. Gelijktijdige aanvragen binnen dezelfde server delen één laadactie. Afgeronde lijsten worden niet langdurig bewaard, zodat latere acties opnieuw de staffrollen ophalen. Bij fouten worden geen onvolledige lijsten gebruikt. Sluiten/verwijderen bevestigt de interactie voordat het op een andere ticketactie wacht.

**Update vanaf 3.1.0:** stop de bot, maak een back-up, vervang de bestanden en herstart. Geen nieuwe dependencies, configuratievelden, SQL of slashcommandregistratie nodig. De eerdere ticketconfiguratie blijft behouden. Zie `UPDATE-3.1.1.txt`.

## Nieuw in 3.1.0: ticketclaims, overnemen en staffthread-log

**Gewone claim:** alleen de behandelaar en ticketmaker kunnen in het ticket typen; toegevoegde niet-staffdeelnemers behouden hun deelname. Andere bevoegde staffleden blijven meelezen en kunnen via **Staffoverleg** de privéthread openen en daar schrijven. De claimknop en `/ticket-claim` werken hetzelfde.

**Overnemen:** een stafflid met een hogere staffrol kan opnieuw op **Claim** klikken of `/ticket-claim` gebruiken. De nieuwe behandelaar neemt het ticket over. Lagere staff verliest toegang tot het ticket én de bijbehorende privéthread; gelijke/hogere bevoegde staff blijft alleen meelezen. De ticketmaker blijft toegang houden. Alleen de nieuwe behandelaar kan als staff in het hoofdticket typen. De hoogste ingestelde staffrol bepaalt de rang; de Discord-serverowner en ingestelde globale botowners hebben voorrang. Een gelijk of lager stafflid kan de claim niet overnemen.

**Discordbeperking:** Administrator omzeilt kanaalrechten. Geef staff geen Administrator als leesrechten strikt moeten worden afgedwongen. Overnemen wordt geweigerd als lagere staff met Administrator daardoor niet kan worden uitgesloten. Voor het ophalen van alle staffleden moet Server Members Intent ingeschakeld zijn; de bot heeft Kanaal beheren en Rollen beheren nodig om kanaalrechten te wijzigen.

### Personen of rollen toevoegen/verwijderen

```text
/ticket-add gebruiker:@Persoon
/ticket-add rol:@Rol
/ticket-remove gebruiker:@Persoon
/ticket-remove rol:@Rol
```

Kies precies één persoon of rol. Een vermelding voegt toegang toe of haalt die weg; deze commando’s dienen niet als losse ping en sturen geen mentionnotificatie. Gewone toegevoegde deelnemers kunnen in het ticket schrijven, maar krijgen geen toegang tot het privéoverleg. Andere staff blijft na een claim alleen-lezen in het ticket. Het minimum van een overgenomen ticket kan niet met `/ticket-add` worden omzeild.

Gelijke of hogere staff wordt beschermd tegen wijzigingen door lagere staff. De ticketmaker, behandelaar, uitvoerder en bots mogen niet via deze commando’s worden gewijzigd. Rollen die deze beschermde personen bevatten worden ook geweigerd; `@everyone` en beheerde botrollen zijn niet toegestaan. Bij verwijderen van een rol vervalt de toegang via die rol; eventuele andere toegangsrechten blijven van toepassing. Een individuele verwijdering gebruikt een expliciete weigering, zodat toegang via een rol niet alsnog behouden blijft.

### Apart log voor het staffoverleg

Stel een apart kanaal in dat alleen staff kan lezen:

```text
/config instellen instelling:Tickets.ThreadLogChannel waarde:#ticket-thread-logs
```

Dit kanaal moet verschillen van `Tickets.LogChannel` en van het ticket/de thread zelf. Bij sluiten én verwijderen wordt de staffthread als apart HTML-transcript in dit kanaal opgeslagen. Een lokale kopie staat onder `transcripts/<server-id>/staff/`. Het gewone tickettranscript gaat zoals voorheen naar de ticketmaker en het gewone ticketlog; het stafftranscript wordt **nooit** aan de ticketmaker gestuurd. Bij opnieuw exporteren wordt een nieuwe momentopname opgeslagen.

Als de staffthread niet kan worden geëxporteerd of het aparte log niet kan worden bereikt, wordt sluiten/verwijderen afgebroken. Geef de bot toegang tot de privéthread en in het logkanaal Kanaal bekijken, Berichten verzenden en Bestanden bijvoegen. De bestaande privéthread houdt de knop **Staffoverleg**; staff hoeft niet rechtstreeks in het hoofdticket te typen om de thread te openen.

### Bijwerken vanaf 3.0.9

Stop de bot, maak een back-up van bestanden en database, vervang de bestanden uit het pakket en voer `npm run deploy` uit voor de nieuwe roloptie. Herstart met `npm start` en stel `Tickets.ThreadLogChannel` in. De database wordt automatisch uitgebreid; er zijn geen nieuwe dependencies. Bij al geclaimde tickets kan de huidige behandelaar nogmaals op Claim klikken om de nieuwe rechten toe te passen zonder lagere staff als bij een overname te verwijderen. Nieuwe claims gebruiken de nieuwe regels direct. Wijzigingen in staffrollen worden bij de volgende claim/toegangsactie verwerkt; Discord-Administrator blijft altijd een uitzondering.

## Nieuw in 3.0.9: ook serveroverstijgende time-outs

`Honeypot.CrossServerBan` geldt nu voor **bans én time-outs**. De bestaande instellingsnaam blijft behouden, zodat ingeschakelde deelname niet verloren gaat. Bij een geslaagde lokale time-out krijgen aanwezige leden in andere deelnemende servers eveneens een time-out van zeven dagen. De bronactie bepaalt de straf; de lokale `Honeypot.Action` van een ontvangende server bepaalt alleen zijn eigen detecties.

```text
/config instellen instelling:Honeypot.CrossServerBan waarde:ja
```

Zet dit aan in iedere deelnemende server, inclusief de bronserver. Voor time-outs heeft de bot **Leden modereren** en voldoende rolpositie nodig. Een reeds actieve time-out wordt behouden. Ontbrekende rechten of een niet-beheerbaar lid worden per server gelogd zonder andere servers te blokkeren. Time-outs verwijderen geen berichten.

Elke server krijgt een eigen logmelding met **Time-out opheffen**. Die knop heft uitsluitend de time-out op in de server waar je klikt. Time-outs in andere servers blijven staan. De actuele rechten, rolhiërarchie en controle op later gewijzigde straffen blijven gelden. De automatische kanaalwaarschuwing vermeldt serveroverstijgende maatregelen bij beide strafopties.

Update vanaf **3.0.8**: stop de bot, maak een back-up, vervang de meegeleverde bestanden en herstart. Geen nieuwe instellingen, dependencies of commandregistratie nodig. Bestaande deelname via `CrossServerBan` is direct ook van toepassing op nieuwe time-outs. Zie `UPDATE-3.0.9.txt`.

## Nieuw in 3.0.8: serveroverstijgende honeypot-ban

Zet in **elke deelnemende server**, inclusief de bronserver, de volgende instelling aan:

```text
/config instellen instelling:Honeypot.CrossServerBan waarde:ja
```

Standaard staat deze instelling uit. Na een geslaagde honeypot-ban controleert de bot de andere deelnemende servers waarin hij aanwezig is. Alleen als de gebruiker daar op dat moment ook lid is, voert de bot een ban uit en verwijdert Discord zeven dagen berichtgeschiedenis. De bronserver moet een ingeschakelde honeypot met actie `ban` hebben. Ontvangende servers hoeven geen eigen honeypot-kanaal te hebben; `CrossServerBan` is hun toestemming om mee te doen. Hun eigen `Action`-keuze geldt alleen voor lokale detectie. Vanaf 3.0.9 worden ook time-outs doorgestuurd; zie de uitleg hierboven.

Elke server gebruikt zijn eigen `Honeypot.LogChannel` of `Logging.Channel`, met een eigen logmelding en knop. **Ban opheffen werkt uitsluitend in de server waar je klikt.** Andere bans blijven staan. Bestaande rechtencontroles blijven gelden. De log noemt de bronserver; de berichtlink is alleen toegankelijk met toegang tot die bronserver en kan na berichtverwijdering niet meer openen.

Mislukte bans door rechten of rolpositie worden per server gelogd en houden andere servers niet tegen. Afwezige gebruikers worden overgeslagen. Er is geen permanente gedeelde banlijst: later toetreden leidt niet automatisch tot een ban. Eerder afgehandelde gebeurtenissen worden niet opnieuw uitgevoerd; fouten worden niet automatisch opnieuw geprobeerd. De kanaalwaarschuwing vermeldt de werking over meerdere servers wanneer deze optie aanstaat.

**Update vanaf 3.0.7:** stop de bot, maak een back-up, vervang de meegeleverde bestanden en herstart. De database wordt automatisch uitgebreid met de herkomst van de ban; bestaande logknoppen blijven werken. Geen nieuwe dependencies of commandregistratie nodig. Zie `UPDATE-3.0.8.txt`.

## Nieuw in 3.0.7: zeven dagen berichten verwijderen bij honeypot-ban

Bij een nieuwe honeypot-ban verwijdert Discord alle berichten van die gebruiker uit de afgelopen zeven dagen in de hele server, inclusief afbeeldingen en bijlagen. Dit geldt niet voor time-outs en werkt niet achteraf voor bestaande bans. De logknop heft de ban op, maar herstelt verwijderde berichten niet.

**Update vanaf 3.0.6:** stop de bot, maak een back-up, vervang de bestanden uit het updatepakket op dezelfde paden en herstart met `npm start`. Geen configuratiewijziging, nieuwe dependencies of commandregistratie nodig. Zie `UPDATE-3.0.7.txt`.

## Nieuw in 3.0.6: honeypot-kanaal

Stel een kanaal in waar elk nieuw gebruikersbericht direct tot een ban of een time-out van **zeven dagen** leidt. Ook berichten met alleen een afbeelding, video, bestand, sticker of embed tellen mee. Threads onder het ingestelde kanaal vallen eveneens onder de controle. Botberichten, webhooks en systeemberichten worden genegeerd. Er worden geen oude berichten achteraf bestraft.

### Instellen via Discord

Gebruik als serverowner of bevoegde developer:

```text
/config instellen instelling:Honeypot.Channel waarde:#niet-typen
/config instellen instelling:Honeypot.Action waarde:ban
/config instellen instelling:Honeypot.LogChannel waarde:#logs
/config instellen instelling:Honeypot.Enabled waarde:ja
```

Kies `waarde:timeout` bij `Honeypot.Action` voor zeven dagen time-out in plaats van een ban. Uitschakelen: `/config instellen instelling:Honeypot.Enabled waarde:nee`. Instellingen werken direct en afzonderlijk per server. De functie staat standaard uit.

| Instelling | Standaard | Werking |
| --- | --- | --- |
| `Honeypot.Enabled` | `false` | Controle aan/uit |
| `Honeypot.Channel` | leeg | Kanaal waarin niet gepost mag worden |
| `Honeypot.Action` | `ban` | `ban` of `timeout` (zeven dagen) |
| `Honeypot.LogChannel` | leeg | Eigen logkanaal; leeg gebruikt `Logging.Channel` |

Honeypot-meldingen worden naar dit logkanaal verstuurd, ook wanneer algemene logging uitstaat. De taal volgt `Logging.Language`. Stel een bereikbaar logkanaal in om de ophefknoppen te ontvangen.

### Automatische waarschuwing en mention

Bij inschakelen plaatst de bot automatisch de tweetalige **WAARSCHUWING / WARNING** in het ingestelde kanaal. De tekst noemt een permanente ban of zeven dagen time-out, afhankelijk van `Honeypot.Action`. De waarschuwing blijft altijd Nederlands én Engels, ongeacht de algemene bottaal.

Kies de mention voordat je de honeypot inschakelt:

```text
/config instellen instelling:Honeypot.Mention waarde:verified
```

| Waarde voor `Honeypot.Mention` | Mention onder de waarschuwing |
| --- | --- |
| `verified` (standaard) | De rol uit `Roles.Verified`; geen mention als deze leeg is |
| `@Rolnaam` of rol-ID | De opgegeven rol |
| `everyone` | `@everyone` |
| `here` | `@here` |
| `none` | Geen mention en geen belregel |

Voor een eigen rol: `/config instellen instelling:Honeypot.Mention waarde:@Geverifieerd`. Voor de standaardkeuze stel je zo nodig eerst `/config instellen instelling:Roles.Verified waarde:@Geverifieerd` in. Alleen bij de eerste plaatsing in een kanaal kan de geselecteerde mention een ping geven. De rol moet vermeldbaar zijn of de bot moet toestemming hebben om alle rollen te vermelden; voor `everyone`/`here` is de bijbehorende mentiontoestemming nodig.

Configwijzigingen werken het bestaande bericht bij, zonder nieuwe ping. Ook na herstart wordt hetzelfde bericht gebruikt. Een verwijderde waarschuwing wordt binnen ongeveer een minuut opnieuw geplaatst zonder ping. Bij uitschakelen of wisselen van kanaal wordt de oude waarschuwing gemarkeerd als inactief. De bot heeft **Kanaal bekijken**, **Berichtgeschiedenis lezen** en **Berichten verzenden** nodig in het honeypot-kanaal. Ontbrekende rechten of een ongeldige mentionrol worden bij een configwijziging gemeld; de instellingen blijven wel opgeslagen.

### Logmelding en opheffen

De logmelding vermeldt gebruiker, kanaal, actie, resultaat en een link naar het oorspronkelijke bericht. Na een geslaagde ban verschijnt **Ban opheffen**; na een geslaagde time-out **Time-out opheffen**. De knop blijft werken na een bot-herstart. Alleen leden met respectievelijk **Leden verbannen** of **Leden modereren** mogen de actie opheffen. Voor time-outs geldt ook de rolhiërarchie. De bot controleert deze rechten opnieuw wanneer iemand klikt.

Na opheffen verdwijnt de knop en staat erbij wie de actie heeft afgehandeld. Een unban laat iemand niet automatisch opnieuw toetreden. Een oude knop heft geen later gewijzigde ban of time-out op. Een reeds actieve time-out wordt bij een nieuwe overtreding behouden, zodat een bestaande straf niet wordt overschreven.

De bot heeft toegang tot het honeypot-kanaal, de passende moderatierechten en een rol boven het doelwit nodig. Voor het logkanaal zijn **Kanaal bekijken**, **Berichten verzenden** en **Links insluiten** nodig. Er is geen automatische staff-uitzondering; Discord kan optreden tegen de servereigenaar, hogere rollen of administrators bij time-outs blokkeren. Mislukte acties krijgen een foutmelding zonder ophefknop. Bij een honeypot-ban verwijdert Discord ook de berichten van die gebruiker uit de afgelopen zeven dagen in de hele server, inclusief afbeeldingen en bijlagen. Bij een time-out worden berichten niet verwijderd. Een unban herstelt verwijderde berichten niet. Als het versturen van de log mislukt, blijft een geslaagde straf actief en kun je die via de gewone moderatiecommando’s opheffen.

### Installatie van deze update

Dit updatepakket is bedoeld voor **3.0.5 inclusief woningupgrades**. Stop de bot, maak een back-up van bestanden en database, plaats alle gewijzigde bestanden op dezelfde paden en start met `npm start`. De nieuwe configuratievelden en de honeypot-opslag worden automatisch toegevoegd. Er zijn geen nieuwe dependencies of slashcommando’s. Bestaande instellingen blijven behouden. `README.md`, `HANDLEIDING.md` en `MANUAL-EN.md` zijn meegeleverd; `/help` gebruikt deze handleidingen. Zie `UPDATE-3.0.6.txt`.

## Nieuw in 3.0.5: woningupgrades via de makelaar

Koopwoningen hebben twee aparte upgradereeksen met elk vijf niveaus. Iedere upgrade verdubbelt de betreffende beloning: ×2, ×4, ×8, ×16 en ×32. Deze factor komt boven op de bestaande woning- en VIP/verjaardagsbonus.

| Niveau | Keukenupgrade — XP | Woningverbetering — inkomen |
| --- | --- | --- |
| 1 | Keukenapparatuur | Werkkamer |
| 2 | Keukenkasten | Glasvezelaansluiting |
| 3 | Werkblad | Werkstudio |
| 4 | Kookeiland | Zakelijke inrichting |
| 5 | Chefkeuken | Luxe kantoor |

De keukenbonus geldt voor XP uit berichten, de berichtenscanner en het telspel. De inkomensbonus geldt voor `/work` en `/daily`. Vast bedrijfsinkomen, overschrijvingen en leningen veranderen niet.

**Gebruik:**

- `/makelaar actie:upgrades` toont de niveaus, volgende upgrades en prijzen.
- `/makelaar actie:upgraden upgrade:keuken betaalmiddel:wallet bevestigen:Ja` koopt de volgende keukenupgrade.
- `/makelaar actie:upgraden upgrade:inkomen betaalmiddel:bank bevestigen:Ja` koopt de volgende inkomensupgrade.
- `/makelaar actie:status` toont je bonussen, woningwaarde en opbrengst bij verkoop of vervanging.

**Prijs en waarde:** iedere upgrade kost standaard 25% van de actuele woningwaarde, naar boven afgerond op hele spel-euro’s. Stel het prijspercentage (`PriceRate`, standaard `0.25`) en de upgradenamen in via `config/housingUpgrades.js`. Herstart de bot na een wijziging van dit bestand.

Iedere upgrade verhoogt de woningwaarde met 25%, samengesteld: `aankoopprijs × 1,25^(keukenniveau + inkomensniveau)`, naar beneden afgerond. Los verkopen geeft 75% van deze waarde terug op de bank; bij vervanging ontvang je 15%. Een starterwoning van €15.000 is na één upgrade €18.750 waard en na tien upgrades €139.698.

Upgrades zijn alleen beschikbaar voor koopwoningen. Ze blijven behouden na herstart en bij economy-/voortgangsresets. Bij verkoop of verhuizing verdwijnen de upgrades van de oude woning; de volgende woning begint op niveau 0/0. Huurwoningen kunnen niet worden geüpgraded.

**Bijwerken vanaf 3.0.4:** stop de bot, maak een back-up van bestanden en database en plaats de gewijzigde bestanden op dezelfde paden. Voer `npm run deploy` uit om de nieuwe makelaaropties te registreren en start met `npm start`. De database wordt automatisch uitgebreid; bestaande woningen blijven behouden. Er zijn geen nieuwe dependencies. Zie [UPDATE-3.0.5.txt](UPDATE-3.0.5.txt).

## Nieuw in 3.0.3: bedrijven, heists en bank

Gebruik `/bedrijf`, `/heist`, `/bank` en `/makelaar actie:verkopen`. Zie `UPDATE-3.0.3.txt` voor installatie, prijzen en alle spelregels.

## Nieuw in 3.0.2: wonen en boodschappen

- `/makelaar`: starterwoning, luxe woning en luxe villa kopen of huren.
- Bronzen, zilveren en gouden woningrollen; +50%, +100% en +200% XP/inkomen boven op VIP.
- Bij verhuizen 15% terug voor je vorige koopwoning; de oude woningrol vervalt.
- Huur elke 24 uur via bank, ook na downtime en bij onvoldoende saldo; opzeggen via `/makelaar`.
- `/supermarkt`: eten en drinken kopen, voorraad bekijken en producten gebruiken.
- Woningen, contracten en voorraad blijven behouden bij alle bestaande resets.
- Zie `UPDATE-3.0.2.txt`, `HANDLEIDING.md` en `MANUAL-EN.md` voor de voorwaarden en commando’s.

## Nieuw in 3.0.1: verplichte rekeningen en economy-reset

**Kopen:** open `/store`, kies **Verplichte rekening · €5.000** en bevestig. Elke aankoop geeft één gebruik; je hoeft nog geen ontvanger te kiezen. Dit werkt ook zonder ingestelde VIP-rol. Betaling kan uit portemonnee of bank, met voldoende saldo.

**Versturen:** `/rekening sturen gebruiker:@lid bedrag:7000 omschrijving:Voorbeeld verplicht:Ja`. De aankoop wordt pas verbruikt zodra de rekening succesvol is opgeslagen. Bedrag: €1 t/m €7.000 spelgeld. Niet naar jezelf, bots of iemand buiten de server. De bestaande rekeningcooldown en limiet van 20 openstaande rekeningen blijven gelden.

**Rente en betaling:** vanaf het versturen stijgt het bedrag elke volle 24 uur met 10% over het actuele bedrag, telkens afgerond op hele spel-euro’s. Bij €7.000 is dat na 7 dagen €13.641. Eerder betalen via `/rekening betalen` stopt de rente; daarbij is voldoende saldo nodig. Weigeren en annuleren zijn bij verplichte rekeningen niet mogelijk. Na zeven dagen schrijft de bot automatisch het bedrag inclusief zeven rentestappen af van de bank van de ontvanger en bij op de bank van de afzender. De ontvanger mag hierdoor in de min komen. Controle iedere 30 seconden en bij opstarten; na uitval wordt de betaling ingehaald, zonder extra rente na dag 7. Bestaande verplichtingen worden ook verwerkt wanneer nieuwe economy-acties uitstaan.

**Bekijken:** `/rekening overzicht` en `/rekening bekijken` tonen de actuele schuld. `/store actie:status` toont ongebruikte aankopen; `/store actie:geschiedenis` toont VIP en rekening-aankopen.

**Reset iedereen:** `/reset-economy bevestigen:Ja`, met dezelfde owner-toegang als `/config`, werkt alleen voor de huidige server. Portemonnees en positieve banksaldi gaan naar €0; daily-, work-, steel- en rekeningcooldowns worden gewist. Gewone openstaande rekeningen worden geannuleerd. XP/levels blijven staan. Lopende VIP-leveringen moeten eerst afgerond zijn.

**Behouden bij serverbrede reset:** VIP, aankoopgeschiedenis, ongebruikte verplichte rekeningen, verstuurde verplichte rekeningen inclusief rente en oorspronkelijke betaaldatum, en bestaande negatieve banksaldi. Dit geldt ook voor `/reset-voortgang`. Een persoonlijke `/economy-reset gebruiker:@lid` zet wél zowel de portemonnee als de bank op €0, inclusief bestaande bankschuld. Aankopen en nog openstaande verplichte rekeningen blijven daarbij intact en kunnen later opnieuw tot een afschrijving leiden. Nieuwe stortingen lossen bankschuld af. Een verstuurde rekening levert bij een reset geen nieuw ongebruikt aankooprecht op.

## 3.0.0 — servertaal en logtaal

- `/config instellen instelling:Bot.Language waarde:nl` kiest Nederlands; `en` kiest Engels en `both` beide talen (standaard).
- `Logging.Language` kiest los de Discord-logtaal: standaard `nl`, optioneel `en` of `both`.
- Gebruikers en rollen worden eenmaal per bericht vermeld; herhalingen tonen gewone namen.
- Persoonlijke `/language`-keuzes blijven gelden. Zonder keuze volgt een Engelse server Engels, anders Nederlands.
- Instellingen werken direct per server. Bestaande /config-bevoegdheden blijven gelden.

## 2.9.9-beta — tweetalige bot

Openbare berichten verschijnen in het Nederlands en Engels. Met `/language` kiest ieder lid de taal voor privéantwoorden. `/help` volgt die voorkeur. Discord toont Engelse commandnamen en beschrijvingen bij een Engelse interface.

Pollvragen en antwoorden worden vertaald en opgeslagen. `vraag-en` en `antwoorden-en` bieden handmatige invoer of correctie. Gebruik `/welkomstbericht vertalen` voor de ingestelde welkomsttekst; met `engels` kun je zelf een vertaling invullen. Na een wijziging van de Nederlandse welkomsttekst opnieuw vertalen. `/say vertalen:True` plaatst je bericht met Engels eronder; met `engels` kun je de vertaling zelf invullen.

Automatische vertaling gebruikt de bestaande `GROQ_API_KEY` in `.env`. Geen nieuwe afhankelijkheden. Er wordt nooit vertaald bij iedere stem of ieder nieuw lid. Zie HANDLEIDING.md en MANUAL-EN.md voor de werking en foutafhandeling.

Controleer lokaal met `npm run check` en `npm run test:languages`. De taaltest gebruikt tijdelijke SQLite-opslag en nagebootste Discord-/Groq-aanroepen.


Complete Discord-bot met tickets, moderatie, XP/levels, economy, verjaardagen, selfrollen, counting, agenda, AI-chat en instelbare welkomstberichten.

## Handleiding

**Voor het eerst gedownload? Begin bij [INSTALLATIE.md](INSTALLATIE.md).** Daarin staan Discord-app aanmaken, hosting, `.env`, opstarten en optionele GroqCloud-AI stap voor stap.

[HANDLEIDING.md](HANDLEIDING.md) bevat de slashcommando’s, instellingen en voorbeelden voor leden en beheerders. [CHANGELOG.md](CHANGELOG.md) beschrijft de wijzigingen.

## Nieuw in 2.9.9-beta — VIP-winkel

Stel `/config instellen instelling:Store.VIPRole waarde:@VIP` in met een aparte VIP-rol, onder de hoogste botrol. De bot heeft Rollen beheren nodig.

`/store` verkoopt 1 dag VIP voor €500, 3 dagen voor €1.300 en 7 dagen voor €2.700 spelgeld. Kies optioneel `betaalmiddel:Bank`. Elke aankoop vraagt bevestiging; verlengingen sluiten aan op je huidige eindtijd. Bekijk `/store actie:status` en `/store actie:geschiedenis`.

VIP geeft de bestaande 2× beloningsbonus wanneer bonusbeloningen aanstaan. De rol verloopt automatisch; controle iedere 30 seconden en bij herstart. De winkel houdt betalingen en eindtijden bij in de database. Gebruik een aparte rol die niet ook als staff-, verjaardags- of automatische ledenrol dient.

Update vanaf 2.6.1 inclusief de Engelse /help-aanvulling: stop de bot, maak een databaseback-up, plaats de bestanden en herstart. De nieuwe tabellen en het commando worden automatisch aangemaakt. Geen nieuwe dependencies.

## Handleidingen in Nederlands en Engels

Gebruik `/help taal:Nederlands` of `/help taal:English` om de gewenste handleiding in het huidige kanaal te ontvangen. Zonder taalkeuze blijft Nederlands de standaard. In een Engelstalige Discord-interface heet de optie `language`. De Engelse handleiding staat in [MANUAL-EN.md](MANUAL-EN.md).

Herstart de bot na deze aanvulling; de taaloptie wordt automatisch geregistreerd. De taalkeuze is sinds de aanvulling op 2.6.1 beschikbaar.

## Nieuw in 2.6.1 — Giveaways

Start als staff een giveaway met `/giveaway start`: titel, tekst, einddatum (`DD-MM-JJJJ UU:MM`, Nederlandse tijd) en prijzen gescheiden door `|`. Elke prijs krijgt één unieke winnaar. Gebruik dezelfde prijs meerdere keren voor meerdere exemplaren.

Leden doen mee via de knop. `/giveaway stoppen` trekt direct winnaars; `/giveaway annuleren` verwijdert een open giveaway zonder trekking. Geef bij beheer het Giveaway-ID onder het bericht op. De einddatum mag maximaal twee kalendermaanden vooruit liggen. Zie [HANDLEIDING.md](HANDLEIDING.md) voor details.

Update vanaf 2.6.0: stop de bot, maak een back-up, plaats de gewijzigde bestanden en herstart. Geen nieuwe dependencies nodig; tabel en slashcommando’s worden automatisch aangemaakt.

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

Stop de bot, maak een back-up en kopieer de bestanden uit het updatepakket naar dezelfde paden in de botmap. Voor 3.0.5 voer je daarna `npm run deploy` uit en start je de bot opnieuw; zie [UPDATE-3.0.5.txt](UPDATE-3.0.5.txt). Voor 2.5.7 zijn geen nieuwe dependencies of slashcommandregistraties nodig; neem de nieuwe helper `utils/deferredReply.js` mee. Voor de Groq-update naar 2.5.6 zijn geen nieuwe dependencies of slashcommandregistraties nodig. Voeg voor AI je eigen GROQ_API_KEY en GROQ_MODEL toe aan je bestaande .env; zie [GROQ-INSTALLATIE.md](GROQ-INSTALLATIE.md). De automatische changelog gebruikt de bestaande logginginstellingen.

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
- `npm run test:living`: woningtests, inclusief upgrades, migratie, betalingen, bonussen, resets en verkoop.
- `npm run prepare:github`: maak een openbare export zonder lokale botdata.

Deze broncode is lokaal gecontroleerd. Er is geen live Discord-test uitgevoerd.
