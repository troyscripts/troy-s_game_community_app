# Troy’s Game Community Bot — Gebruikershandleiding

**Botversie 2.5.8 · Bijgewerkt op 10 oktober 2026**

Iedere server beheert de eigen instellingen via `/config` in Discord. De vaste-configmodus is verwijderd.

Deze handleiding legt uit hoe je de bot in Discord gebruikt. Leden vinden hier de commands voor verjaardagen, levels, spelgeld en plezier. Staffleden en serverbeheerders vinden verderop de beheercommands en instellingen.

## Nieuw in versie 2.5.0

- De herstelupdates zijn inbegrepen: ontbrekende tekst krijgt een ingebouwde standaard en toetredingsberichten lezen de tekst rechtstreeks voor de juiste server.
- Pas de welkomsttekst direct in Discord aan met `/welkomstbericht instellen`.
- Bekijk uitleg over de invulvelden en een voorbeeld van je huidige tekst met `/welkomstbericht voorbeeld`.
- Gebruik invulvelden voor het nieuwe lid, de servernaam, het actuele ledenaantal en Discord-ID’s.
- De welkomsttekst wordt per server opgeslagen en blijft na een herstart bewaard. Dit werkt ook op Troy’s Game Community wanneer de overige instellingen uit `config/defaults.js` komen.
- Sinds 2.4.9 toont `/ping` ook de verbindingsstatus, gemiddelde/minimale/maximale Gateway-ping, uptime en verbindingsgebeurtenissen. Revisie 2.4.9A verbeterde de stabiliteit van de statusmeldingen.

## /help — Handleiding en support

Gebruik `/help` om deze handleiding als downloadbare bijlage te ontvangen in het kanaal waar je het commando uitvoert. Het bericht is zichtbaar voor iedereen die toegang heeft tot dat kanaal. Iedereen kan dit commando gebruiken; de wachttijd is 10 seconden per gebruiker.

Voor support ga naar https://discord.gg/nTzVy5uMWX

De bot heeft in dat kanaal toestemming nodig om berichten te verzenden en bestanden bij te voegen.

## Snel beginnen

Typ `/` in een Discord-kanaal en kies een command van de bot. Discord laat zien welke velden je moet invullen. **Verplicht** betekent dat je het veld moet invullen; **optioneel** mag je overslaan.

| Wat wil je doen? | Zo doe je dat |
| --- | --- |
| De bot-handleiding ontvangen | `/help` |
| Je verjaardag instellen | `/setbirthday datum:15-09-1991` — vul je eigen geboortedatum in. |
| Je level en XP bekijken | `/rank` |
| Je saldo bekijken | `/balance` |
| Spelgeld verdienen | `/daily` of `/work` |
| Een rol kiezen | Klik op een knop in het selfrolpaneel; klik opnieuw om de rol te verwijderen. |
| Hulp vragen | Gebruik het ticketpaneel in het daarvoor bestemde kanaal. |
| Welkomsttekst aanpassen (beheer) | `/welkomstbericht instellen` — gebruik eerst `/welkomstbericht voorbeeld` voor uitleg. |
| Met de AI praten | Stuur een bericht in een aangewezen AI-kanaal. |

De geldbedragen in deze handleiding zijn **spelgeld**. Functies kunnen per server anders zijn ingesteld. Zie je een command niet of krijg je een melding over ontbrekende rechten? Vraag dan een serverbeheerder om hulp.

## Rechten

Iedereen kan de ledencommands gebruiken, voor zover de server die beschikbaar stelt. Beheercommands vereisen de rechten die bij het command staan.

Met **Owner-toegang** bedoelen we de servereigenaar, de botowner of iemand met de ingestelde Owner- of Developer-rol. Administrator geeft toegang tot veel stafffuncties en selfrolbeheer, maar niet automatisch tot `/config`. Voor `/give` en `/economy-reset` gelden aparte voorwaarden, die bij die commands staan.

De volgorde van Discord-rollen en toegang tot kanalen blijven van belang: ook met beheerrechten kun je niet altijd iedere rol of gebruiker beheren.

## Commands voor leden — Verjaardagen

### /setbirthday

Stel je verjaardag in.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/setbirthday` | `datum` (verplicht): Gebruik formaat DD-MM-JJJJ (bijv. 15-09-1991) |

### /birthday

Bekijk de verjaardag van een gebruiker.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/birthday` | `gebruiker` (optioneel): Van wie wil je de verjaardag bekijken? |

### /birthdays

Bekijk de verjaardagen binnen de community.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/birthdays` | Geen |

### /removebirthday

Verwijder je opgeslagen verjaardag.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/removebirthday` | Geen |

## Commands voor leden — Levels en XP

### /rank

Bekijk je level en XP.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/rank` | `gebruiker` (optioneel): Bekijk het level van iemand anders. |

### /level

Bekijk het level van een gebruiker.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/level` | `gebruiker` (verplicht): De gebruiker waarvan je het level wilt bekijken. |

### /leaderboard

Bekijk de level ranglijst.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/leaderboard` | Geen |

## Commands voor leden — Spelgeld

### /balance

Bekijk je saldo.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/balance` | `gebruiker` (optioneel): Bekijk het saldo van iemand anders. |

### /daily

Claim je dagelijkse beloning.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/daily` | Geen |

### /work

Werk om geld te verdienen.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/work` | Geen |

### /deposit

Zet geld op je bankrekening.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/deposit` | `bedrag` (verplicht): Hoeveel geld wil je storten?; min: 1 |

### /withdraw

Neem geld op van je bank.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/withdraw` | `bedrag` (verplicht): Hoeveel geld wil je opnemen?; min: 1 |

### /pay

Stuur geld naar een andere gebruiker.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/pay` | `gebruiker` (verplicht): Wie krijgt het geld?<br>`bedrag` (verplicht): Hoeveel geld wil je sturen?; min: 1 |

### /rekening

Verstuur en beheer rekeningen voor spelgeld.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/rekening sturen` | `gebruiker` (verplicht): Ontvanger<br>`bedrag` (verplicht): Bedrag in spelgeld; min: 1; max: 1000000<br>`omschrijving` (verplicht): Waarvoor is de rekening?; min. tekens: 1; max. tekens: 200 |
| `/rekening overzicht` | `richting` (optioneel): Welke rekeningen?; keuzes `received` (ontvangen) en `sent` (verstuurd)<br>`pagina` (optioneel): 10 rekeningen per pagina; min: 1; max: 100000 |
| `/rekening bekijken` | `nummer` (verplicht): Het rekeningnummer uit je overzicht; min: 1 |
| `/rekening betalen` | `nummer` (verplicht): Het rekeningnummer uit je overzicht; min: 1<br>`van` (optioneel): Betaalmiddel; standaard bank; keuzes `bank` (bankrekening) en `wallet` (portemonnee) |
| `/rekening weigeren` | `nummer` (verplicht): Het rekeningnummer uit je overzicht; min: 1 |
| `/rekening annuleren` | `nummer` (verplicht): Het rekeningnummer uit je overzicht; min: 1 |

### /stelen

Probeer spelgeld uit iemands portemonnee te stelen; bij mislukken betaal je €100.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/stelen` | `gebruiker` (verplicht): Van wie wil je proberen te stelen? |

### /economy-leaderboard

Bekijk de rijkste gebruikers.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/economy-leaderboard` | Geen |

## Commands voor leden — Plezier en informatie

### /8ball

Stel een vraag aan de magische 8-ball.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/8ball` | `vraag` (verplicht): De vraag die je wilt stellen. |

### /avatar

Bekijk de avatar van een gebruiker.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/avatar` | `gebruiker` (optioneel): Van welke gebruiker wil je de avatar zien? |

### /banner

Bekijk de Discord banner van een gebruiker.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/banner` | `gebruiker` (optioneel): Van welke gebruiker wil je de banner zien? |

### /coinflip

Gooi een muntje.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/coinflip` | Geen |

### /dice

Gooi een dobbelsteen.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/dice` | `zijden` (optioneel): Aantal zijden van de dobbelsteen.; min: 2; max: 100 |

### /meme

Bekijk een willekeurige meme.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/meme` | Geen |

### /ping

Bekijk de snelheid en verbindingsstatus van de bot.

- **Bot latency:** de gemeten tijd tussen jouw command en het antwoord van de bot.
- **Discord Gateway:** de actuele ping van de verbinding met Discord.
- **Status:** Normaal, Verhoogd, Hoog, Kritiek of Onbekend. De status gebruikt verschillende grenzen voor stijgen en dalen, zodat hij niet bij iedere kleine schommeling wisselt.
- **Gemiddelde, Minimum en Maximum:** Gateway-metingen uit de huidige botsessie, met maximaal 24 uur geschiedenis.
- **Uptime en Metingen:** hoe lang de bot draait en hoeveel metingen beschikbaar zijn.
- **Gateway-events:** aantallen disconnects, reconnects en timeouts in deze botsessie.

Een losse hoge meting of een reconnect bewijst niet dat de bot vastloopt. Bekijk bij aanhoudende problemen meerdere metingen en geef die door aan de beheerder.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/ping` | Geen |

### /poll

Maak een poll.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/poll` | `vraag` (verplicht): De vraag voor de poll. |

### /ship

Bekijk de liefde match tussen twee gebruikers.

**Toegang:** Iedereen. Eventuele wachttijden en serverinstellingen blijven gelden.

| Gebruik | Opties |
| --- | --- |
| `/ship` | `persoon1` (verplicht): De eerste persoon.<br>`persoon2` (verplicht): De tweede persoon. |

## Commands voor staff — Moderatie

### /ban

Verban een gebruiker van de server.

**Toegang:** Owner of Discord-rechten: Leden verbannen.

| Gebruik | Opties |
| --- | --- |
| `/ban` | `gebruiker` (verplicht): De gebruiker die je wilt bannen.<br>`reden` (verplicht): Reden van de ban.<br>`dagen` (optioneel): Aantal dagen berichten verwijderen.; min: 0; max: 7 |

### /unban

Verwijder een ban van een gebruiker.

**Toegang:** Owner of Discord-rechten: Leden verbannen.

| Gebruik | Opties |
| --- | --- |
| `/unban` | `userid` (verplicht): Discord ID van de gebruiker. |

### /kick

Verwijder een gebruiker van de server.

**Toegang:** Owner of Discord-rechten: Leden verwijderen.

| Gebruik | Opties |
| --- | --- |
| `/kick` | `gebruiker` (verplicht): De gebruiker die je wilt kicken.<br>`reden` (verplicht): Reden van de kick. |

### /timeout

Geef een gebruiker een timeout.

**Toegang:** Owner of Discord-rechten: Leden modereren.

| Gebruik | Opties |
| --- | --- |
| `/timeout` | `gebruiker` (verplicht): De gebruiker die een timeout krijgt.<br>`duur` (verplicht): Aantal minuten timeout.; min: 1; max: 40320<br>`reden` (verplicht): Reden van de timeout. |

### /untimeout

Verwijder een timeout van een gebruiker.

**Toegang:** Owner of Discord-rechten: Leden modereren.

| Gebruik | Opties |
| --- | --- |
| `/untimeout` | `gebruiker` (verplicht): De gebruiker waarvan je de timeout wilt verwijderen. |

### /warn

Geef een waarschuwing aan een gebruiker.

**Toegang:** Owner of Discord-rechten: Berichten beheren.

| Gebruik | Opties |
| --- | --- |
| `/warn` | `gebruiker` (verplicht): De gebruiker die je wilt waarschuwen.<br>`reden` (verplicht): Reden van de waarschuwing. |

### /warnings

Bekijk de waarschuwingen van een gebruiker.

**Toegang:** Owner of Discord-rechten: Berichten beheren.

| Gebruik | Opties |
| --- | --- |
| `/warnings` | `gebruiker` (verplicht): De gebruiker waarvan je waarschuwingen wilt zien. |

### /clear

Verwijder berichten uit een kanaal.

**Toegang:** Owner of Discord-rechten: Berichten beheren.

| Gebruik | Opties |
| --- | --- |
| `/clear` | `aantal` (verplicht): Aantal berichten om te verwijderen.; min: 1; max: 100 |

### /purge

Verwijder een aantal berichten.

**Toegang:** Owner of Discord-rechten: Berichten beheren.

| Gebruik | Opties |
| --- | --- |
| `/purge` | `aantal` (verplicht): Aantal berichten om te verwijderen.; min: 1; max: 100 |

## Commands voor staff — Levels, spelgeld en berichten

### /setxp

Stel de XP van een gebruiker in.

**Toegang:** Owner of Discord-rechten: Server beheren.

| Gebruik | Opties |
| --- | --- |
| `/setxp` | `gebruiker` (verplicht): De gebruiker waarvan je XP wilt aanpassen.<br>`xp` (verplicht): Nieuwe XP waarde.; min: 0 |

### /resetxp

Reset de XP van een gebruiker.

**Toegang:** Owner of Discord-rechten: Server beheren.

| Gebruik | Opties |
| --- | --- |
| `/resetxp` | `gebruiker` (verplicht): De gebruiker waarvan je XP wilt resetten. |

### /give

Geef een gebruiker geld.

**Toegang:** Botowner of iemand met de ingestelde Owner-, Hoofdadmin- of Adminrol. Alleen de Developer-rol, servereigenaar zijn of Administrator hebben is voor dit command niet voldoende.

| Gebruik | Opties |
| --- | --- |
| `/give` | `gebruiker` (verplicht): Wie krijgt het geld?<br>`bedrag` (verplicht): Hoeveel geld moet erbij?; min: 1 |

### /economy-reset

Reset de economie van een gebruiker.

**Toegang:** Botowner of iemand met de ingestelde Owner-, Hoofdadmin- of Adminrol. Alleen de Developer-rol, servereigenaar zijn of Administrator hebben is voor dit command niet voldoende.

| Gebruik | Opties |
| --- | --- |
| `/economy-reset` | `gebruiker` (verplicht): Welke gebruiker moet worden gereset? |

### /say

Laat de bot een bericht sturen.

**Toegang:** Standaard het Discord-recht Berichten beheren. Je moet het doelkanaal kunnen zien en er berichten kunnen sturen. Ook de bot heeft daar toegang nodig.

| Gebruik | Opties |
| --- | --- |
| `/say` | `bericht` (verplicht): Het bericht dat de bot moet sturen.; min. tekens: 1; max. tekens: 2000<br>`embed` (verplicht): Wil je het bericht als embed versturen?<br>`kanaal` (optioneel): Kies het kanaal waarin het bericht moet komen. |

## Commands voor staff — Tickets

### /ticket-panel

Plaats een ticketpaneel met maximaal 10 eigen categorieën.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-panel` | `categorie1` (optioneel): Naam van categorie 1, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol1` (optioneel): Laagste staffrang voor categorie 1; leeg = alle staffrollen<br>`categorie2` (optioneel): Naam van categorie 2, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol2` (optioneel): Laagste staffrang voor categorie 2; leeg = alle staffrollen<br>`categorie3` (optioneel): Naam van categorie 3, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol3` (optioneel): Laagste staffrang voor categorie 3; leeg = alle staffrollen<br>`categorie4` (optioneel): Naam van categorie 4, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol4` (optioneel): Laagste staffrang voor categorie 4; leeg = alle staffrollen<br>`categorie5` (optioneel): Naam van categorie 5, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol5` (optioneel): Laagste staffrang voor categorie 5; leeg = alle staffrollen<br>`categorie6` (optioneel): Naam van categorie 6, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol6` (optioneel): Laagste staffrang voor categorie 6; leeg = alle staffrollen<br>`categorie7` (optioneel): Naam van categorie 7, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol7` (optioneel): Laagste staffrang voor categorie 7; leeg = alle staffrollen<br>`categorie8` (optioneel): Naam van categorie 8, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol8` (optioneel): Laagste staffrang voor categorie 8; leeg = alle staffrollen<br>`categorie9` (optioneel): Naam van categorie 9, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol9` (optioneel): Laagste staffrang voor categorie 9; leeg = alle staffrollen<br>`categorie10` (optioneel): Naam van categorie 10, bijvoorbeeld Support of Bug melden; min. tekens: 1; max. tekens: 50<br>`minimumrol10` (optioneel): Laagste staffrang voor categorie 10; leeg = alle staffrollen |

### /ticket-add

Voeg een gebruiker toe aan dit ticket.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-add` | `gebruiker` (verplicht): De gebruiker die toegang krijgt. |

### /ticket-remove

Verwijder een gebruiker uit dit ticket.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-remove` | `gebruiker` (verplicht): De gebruiker die verwijderd moet worden. |

### /ticket-claim

Claim een ticket.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-claim` | Geen |

### /ticket-info

Bekijk informatie over dit ticket.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-info` | Geen |

### /ticket-close

Sluit het huidige ticket en stuur de eigenaar een transcript.

**Toegang:** Owner of Discord-rechten: Kanalen beheren.

| Gebruik | Opties |
| --- | --- |
| `/ticket-close` | Geen |

## Commands voor beheerders

### /bot-avatar

Beheer de profielfoto van de bot op deze server.

**Toegang:** Owner / ingestelde Developer-rol.

| Gebruik | Opties |
| --- | --- |
| `/bot-avatar instellen` | `afbeelding` (verplicht): PNG, JPG of GIF van maximaal 2 MB |
| `/bot-avatar bekijken` | Geen |
| `/bot-avatar herstellen` | Geen |

### /welkomstbericht

Pas het bericht aan dat nieuwe leden bij binnenkomst ontvangen.

**Toegang:** Owner-toegang of de ingestelde Developer-rol. De bevestiging en het voorbeeld zijn alleen zichtbaar voor degene die het command gebruikt.

| Gebruik | Opties |
| --- | --- |
| `/welkomstbericht voorbeeld` | Geen. Toont de beschikbare invulvelden en een voorbeeld met jouw gebruiker en het huidige ledenaantal. |
| `/welkomstbericht instellen` | `tekst` (verplicht): de nieuwe welkomsttekst, maximaal 4000 tekens. |

**Zo maak je een welkomstboodschap:**

1. Gebruik `/welkomstbericht voorbeeld` om de beschikbare invulvelden te bekijken.
2. Kies `/welkomstbericht instellen` en vul bij `tekst` je volledige boodschap in.
3. Controleer het privévoorbeeld in de bevestiging. De opgeslagen tekst geldt direct voor nieuwe leden en blijft na een herstart bewaard.

| Invulveld | Wordt vervangen door | Voorbeeld |
| --- | --- | --- |
| `{gebruiker}` | Een vermelding van het nieuwe lid | @Troy |
| `{gebruikersnaam}` | De Discord-gebruikersnaam van het lid | troy |
| `{server}` | De naam van deze Discord-server | Troy’s Game Community |
| `{ledenaantal}` | Het actuele totale ledenaantal, inclusief bots en het nieuwe lid | 250 |
| `{gebruikersid}` | Het Discord-ID van het nieuwe lid | ID van het lid |
| `{serverid}` | Het Discord-ID van de server | ID van de server |

**Kopieer dit in het veld `tekst`:**

```text
👋 Welkom {gebruiker} bij **{server}**!\n\nJij bent lid nummer **{ledenaantal}**. 🎉\nLees de regels en verifieer jezelf. Veel plezier!
```

`\n` wordt bij het opslaan via dit command een nieuwe regel. `\n\n` maakt een lege regel. Je kunt Markdown gebruiken, zoals `**vetgedrukte tekst**`. Gebruik de invulvelden precies zoals in de tabel; onbekende invulvelden blijven letterlijk staan.

De tekst verschijnt in een embed met de titel **Lid toegetreden**. Alleen de beschrijving wordt aangepast. Een lang privévoorbeeld wordt ingekort; dat verwijdert niets uit de opgeslagen tekst. Het uiteindelijke bericht wordt begrensd op 4000 tekens, ook na het invullen van de variabelen.

**Voorwaarden:** `Welcome.Enabled` moet aanstaan en `Welcome.Channel` moet een bereikbaar tekstkanaal zijn. De bot heeft daar toestemming nodig om berichten te verzenden en links in te sluiten. Dit command verandert de tekst; het stelt geen kanaal in en schakelt de welkomstfunctie niet in. Een lid-toetredingsmelding kan daarnaast via de bestaande loginstellingen worden verstuurd.

### /reset-voortgang

**Toegang:** dezelfde Owner-/Developer-toegang als `/config`.

Gebruik `/reset-voortgang bevestigen:Ja` om de voortgang van iedereen in deze server definitief te resetten. Met `Nee` gebeurt niets.

- XP: level 1, 0 XP, 0 berichten en de XP-cooldown op nul.
- Economy: bestaande profielen krijgen €0 wallet en €0 bank. Daily-, work-, steel- en rekeningcooldowns worden gewist.
- Openstaande rekeningen worden geannuleerd; afgehandelde rekeningen en steelhistorie blijven bewaard.
- Bestaande profielen blijven bestaan, zodat zij niet opnieuw startgeld krijgen. Nieuwe gebruikers krijgen nog steeds het ingestelde startgeld.
- De leaderboards tonen de geresette waarden. Nieuwe activiteit bouwt weer XP en geld op.
- Bestaande Discord-rollen, serverinstellingen, counting, tickets, verjaardagen en andere servers blijven ongewijzigd.

Er is geen ongedaan-maakcommand. Maak vooraf een databaseback-up als je later wilt kunnen terugzetten.

### /config

Bekijk of wijzig de instellingen van deze Discord-server

**Toegang:** Owner / ingestelde Developer-rol.

| Gebruik | Opties |
| --- | --- |
| `/config bekijken` | `onderdeel` (optioneel): Optioneel onderdeel, bijvoorbeeld Tickets |
| `/config instellen` | `instelling` (verplicht): Bijvoorbeeld Counting.Channel<br>`waarde` (optioneel): Nieuwe waarde; laat leeg bij StaffRoles om rollen aan te klikken |
| `/config herstellen` | `instelling` (verplicht): De instelling die hersteld moet worden |
| `/config exporteren` | Geen |
| `/config resetten` | `bevestigen` (verplicht): Kies Ja om alle serverinstellingen te resetten |
| `/config hulp` | Geen |

### /agenda

Beheer en toon de planning van het YouTube-kanaal.

**Toegang:** Owner / ingestelde Developer-rol.

| Gebruik | Opties |
| --- | --- |
| `/agenda toevoegen` | `titel` (verplicht): Titel van de video, stream of activiteit.; min. tekens: 1; max. tekens: 100<br>`datum` (verplicht): Geplande datum in het formaat DD-MM-JJJJ.; min. tekens: 10; max. tekens: 10<br>`tijd` (verplicht): Geplande tijd in het formaat UU:MM.; min. tekens: 5; max. tekens: 5<br>`beschrijving` (optioneel): Optionele extra uitleg voor de planning.; min. tekens: 1; max. tekens: 500 |
| `/agenda verwijderen` | `id` (verplicht): Het nummer van het agendapunt.; min: 1 |
| `/agenda tonen` | `kanaal` (optioneel): Doelkanaal; standaard wordt het huidige kanaal gebruikt. |
| `/agenda lijst` | Geen |

### /selfrollen

Beheer meerdere selfrolpanelen per server. Leden klikken op een knop om een rol te krijgen; nogmaals klikken verwijdert die rol.

**Beheer:** Owner-toegang, ingestelde Developer-rol of Discord Administrator. Gewone stafftoegang alleen is onvoldoende.

| Gebruik | Opties |
| --- | --- |
| `/selfrollen maken` | `naam` (verplicht): unieke naam, maximaal 32 tekens; kleine letters, cijfers, `_` en `-`. Opent een formulier voor titel en tekst. |
| `/selfrollen tekst` | `paneel` (verplicht): kies een bestaand paneel; opent het tekstformulier. |
| `/selfrollen knop` | `paneel`, `rol`, `label` (verplicht); label maximaal 80 tekens. `kleur` (optioneel): Blauw, Grijs, Groen of Rood. `emoji` (optioneel): één emoji of `<:naam:id>`; `geen` wist de emoji. |
| `/selfrollen knop-verwijderen` | `paneel`, `rol` (verplicht). |
| `/selfrollen plaatsen` | `paneel`, `kanaal` (verplicht): tekst- of aankondigingskanaal. `bericht-id` (optioneel): vervang een bestaand selfrolbericht van deze bot in dat kanaal. |
| `/selfrollen voorbeeld` | `paneel` (verplicht): privévoorbeeld met de knoppen als tekst. |
| `/selfrollen verversen` | `paneel` (verplicht): werk alle geregistreerde berichten opnieuw bij. |
| `/selfrollen verwijderen` | `paneel`, `bevestigen` (verplicht): kies Ja om het paneel te verwijderen en de knoppen uit te schakelen. |
| `/selfrollen lijst` | Geen; toont panelen, aantallen knoppen en geplaatste berichten. |
| `/selfrollen hulp` | Geen; toont de bedieningsstappen. |

**Paneel instellen:** maak een paneel, vul de titel en tekst in, voeg de gewenste knoppen toe en plaats het paneel in een kanaal. De titel mag maximaal 256 tekens bevatten en de tekst maximaal 4000 tekens; Markdown is mogelijk. Per paneel passen maximaal 25 knoppen. Dezelfde rol opnieuw instellen wijzigt de bestaande knop.

Je kunt één paneel meerdere keren plaatsen. Tekst- en knopwijzigingen werken alle geregistreerde exemplaren bij. Gebruik `verversen` als een bericht tijdelijk niet bereikbaar was. Het verwijderen van een knop of paneel verwijdert geen al toegekende ledenrollen.

**Bestaande standaardpanelen vervangen:** gebruik `plaatsen` met hun `bericht-id`. Alleen bestaande selfrolberichten van dezelfde bot zijn vervangbaar. Oude panelen die je niet vervangt blijven de instellingen `SelfRoles.fivem`, `SelfRoles.ats`, `SelfRoles.minecraft` en `SelfRoles.streams` gebruiken.

De bot heeft Rollen beheren nodig en zijn hoogste rol moet boven de uit te delen rol staan. Beheerde rollen, @everyone, ingestelde staffrollen en rollen met beheerrechten worden geweigerd. Behalve de echte servereigenaar moet ook de beheerder boven de gekozen rol staan. De controles worden bij rolklikken opnieuw uitgevoerd.

Wijzigingen aan panelen en het toevoegen of verwijderen van rollen worden bijgehouden. Met `Logging.Enabled` aan verschijnen deze meldingen in het kanaal bij `Logging.Channel`. Beheer de panelen met `/selfrollen`.

## Serverinstellingen via Discord

Dit onderdeel is voor beheerders met Owner-toegang. Gebruik `/config bekijken` om de huidige instellingen te zien. Wijzigingen gelden voor de server waarin je het command gebruikt.

Bij `/config instellen` kies je een **instelling** en vul je een **waarde** in. Bijvoorbeeld:

```text
/config instellen instelling:Birthday.CheckTime waarde:00:00
/config instellen instelling:Tickets.MaxOpenPerUser waarde:5
/config instellen instelling:StaffRoles
```

Bij `StaffRoles` laat je de waarde leeg om rollen aan te klikken. De standaarden hieronder gelden voor een nieuwe server; bestaande instellingen kunnen afwijken. Voor Troy’s Game Community zijn de waarden in `config/defaults.js` leidend. De tabel bevat de instellingen die relevant zijn voor gebruik en beheer.

| Instelling | Type | Standaard | Betekenis |
| --- | --- | --- | --- |
| `Prefix` | tekst / ID | `"!"` | Prefix die gewone berichten uitsluit van verwerking, bijvoorbeeld !. De bot voert opdrachten via slashcommands uit. |
| `Bot.Name` | tekst / ID | `"Troy's Gamecommunity"` | Naam in botberichten; `{server}` in de welkomsttekst gebruikt de Discord-servernaam; wijzigt niet de Discord-accountnaam. |
| `Bot.Color` | tekst / ID | `"#c9a91b"` | Kleur van embeds, bijvoorbeeld #c9a91b. |
| `Bot.Footer` | tekst / ID | `"Troy's Gamecommunity Discord"` | Voettekst onder embeds. |
| `Roles.Developer` | tekst / ID | `leeg` | Developer-rol met ownerrechten binnen de server, inclusief /config. Standaard niet gekoppeld. |
| `Roles.Owner` | tekst / ID | `leeg` | Owner-rol met ownerrechten binnen de server, inclusief /config. |
| `Roles.HeadAdmin` | tekst / ID | `leeg` | Hoofdadminrol; onder meer voor give en economy-reset. |
| `Roles.Admin` | tekst / ID | `leeg` | Adminrol; onder meer voor give en economy-reset. |
| `Roles.HeadModerator` | tekst / ID | `leeg` | Hoofdmoderatorrol. Voeg deze ook toe aan StaffRoles voor stafftoegang. |
| `Roles.Moderator` | tekst / ID | `leeg` | Moderatorrol. Voeg deze ook toe aan StaffRoles voor stafftoegang. |
| `Roles.Verified` | tekst / ID | `leeg` | Rol die de verificatieknop toekent. |
| `Roles.NewUser` | tekst / ID | `leeg` | Rol die de verificatieknop na verificatie verwijdert. |
| `StaffRoles` | lijst | `[]` | Gewone staffrollen. Laat waarde leeg bij /config instellen om rollen aan te klikken (maximaal 25). |
| `SelfRoles.fivem` | tekst / ID | `leeg` | Rol voor de FiveM-knop op een oud standaardpaneel. Gebruik /selfrollen voor nieuwe panelen. |
| `SelfRoles.ats` | tekst / ID | `leeg` | Rol voor de ATS-knop op een oud standaardpaneel. Gebruik /selfrollen voor nieuwe panelen. |
| `SelfRoles.minecraft` | tekst / ID | `leeg` | Rol voor de Minecraft-knop op een oud standaardpaneel. Gebruik /selfrollen voor nieuwe panelen. |
| `SelfRoles.streams` | tekst / ID | `leeg` | Rol voor de Streams-knop op een oud standaardpaneel. Gebruik /selfrollen voor nieuwe panelen. |
| `Logging.Enabled` | ja/nee | `ja` | Activiteitsmeldingen, updateberichten en selfrolmeldingen in Discord aan- of uitzetten. Verwijderde berichten schakel je apart in of uit met Logging.MessageDelete. |
| `Logging.MessageDelete` | ja/nee | `ja` | Verwijderde gebruikersberichten loggen in het ingestelde Discord-logkanaal. |
| `Logging.Channel` | tekst / ID | `leeg` | Kanaal voor meldingen over berichten, commandgebruik, leden, selfrollen en botupdates. |
| `Tickets.Enabled` | ja/nee | `nee` | Nieuwe tickets via de ticket-openknop toestaan. |
| `Tickets.Transcript` | ja/nee | `ja` | Deze schakelaar stopt het versturen van gespreksoverzichten momenteel niet. |
| `Tickets.AutoClose` | ja/nee | `nee` | Automatisch sluiten is momenteel niet actief. Sluit tickets handmatig. |
| `Tickets.Category` | tekst / ID | `leeg` | Algemene terugvalbestemming voor oude panelen zonder eigen doelcategorie. |
| `Tickets.LogChannel` | tekst / ID | `leeg` | Ticketmeldingen en transcriptkopieën, indien bereikbaar. |
| `Tickets.MaxOpenPerUser` | getal | `5` | Maximumaantal gelijktijdig open tickets per gebruiker per server. Bestaande opgeslagen waarden blijven leidend. |
| `Levels.Enabled` | ja/nee | `ja` | Automatische XP-toekenning aan- of uitzetten, ook voor counting. Bestaande levelcommands blijven beschikbaar. |
| `Levels.XPMin` | getal | `5` | Minimum willekeurige XP-beloning per normaal bericht. |
| `Levels.XPMax` | getal | `14` | Maximum willekeurige XP-beloning per normaal bericht. |
| `Levels.Cooldown` | getal | `60` | Wachttijd in seconden tussen normale XP-beloningen voor dezelfde gebruiker. |
| `Levels.AnnounceLevelUp` | ja/nee | `ja` | Een levelstijging in het berichtkanaal aankondigen. |
| `Levels.Roles.0` | tekst / ID | `leeg` | Rol die wordt toegekend vanaf level 0; de hoogste behaalde ingestelde drempel wordt gekozen. Oude levelrollen worden hier niet verwijderd. |
| `Levels.Roles.3` | tekst / ID | `leeg` | Rol die wordt toegekend vanaf level 3; de hoogste behaalde ingestelde drempel wordt gekozen. Oude levelrollen worden hier niet verwijderd. |
| `Levels.Roles.10` | tekst / ID | `leeg` | Rol die wordt toegekend vanaf level 10; de hoogste behaalde ingestelde drempel wordt gekozen. Oude levelrollen worden hier niet verwijderd. |
| `Levels.Roles.20` | tekst / ID | `leeg` | Rol die wordt toegekend vanaf level 20; de hoogste behaalde ingestelde drempel wordt gekozen. Oude levelrollen worden hier niet verwijderd. |
| `Levels.Roles.30` | tekst / ID | `leeg` | Rol die wordt toegekend vanaf level 30; de hoogste behaalde ingestelde drempel wordt gekozen. Oude levelrollen worden hier niet verwijderd. |
| `Economy.Enabled` | ja/nee | `ja` | Schakelt stelen en rekeningen aan of uit. Andere spelgeldcommands worden hiermee niet allemaal uitgeschakeld. |
| `Economy.StartingMoney` | getal | `500` | Startbedrag in de portemonnee bij het aanmaken van een economierekening. |
| `Economy.DailyCooldownHours` | getal | `24` | Wachttijd voor daily, in uren. Bij 0 blijft de wachttijd 24 uur. |
| `Economy.WorkCooldownMinutes` | getal | `60` | Wachttijd voor work, in minuten. Bij 0 blijft de wachttijd 60 minuten. |
| `Counting.Enabled` | ja/nee | `ja` | Het telspel in het ingestelde kanaal inschakelen. |
| `Counting.Channel` | tekst / ID | `leeg` | Kanaal waarin spelers om de beurt opeenvolgende getallen plaatsen. |
| `Counting.RewardXP` | getal | `10` | XP-beloning voor een correct getal; vereist Levels.Enabled. |
| `Counting.FeedbackDeleteSeconds` | getal | `30` | Na hoeveel seconden een foutmelding van counting wordt verwijderd; 0 laat de melding staan. |
| `AIChat.Enabled` | ja/nee | `nee` | AI-antwoorden aan- of uitzetten. |
| `AIChat.Channels` | lijst | `[]` | Lijst kanaal-ID’s waarin de AI mag antwoorden. Lege lijst betekent nergens antwoorden. Threads vereisen hun eigen ID. |
| `AIChat.Mode` | tekst / ID | `"all"` | all: reageer op gewone tekstberichten. mention: reageer alleen op een expliciete vermelding van de bot. |
| `AIChat.CooldownSeconds` | getal | `10` | Wachttijd per gebruiker per kanaal na een succesvol antwoord: 1–300 seconden. |
| `AIChat.HistoryTurns` | getal | `4` | Aantal eerdere gespreksrondes dat de AI onthoudt: 0–8; bij 0 kijkt de AI niet terug in het gesprek. |
| `AIChat.Personality` | tekst / ID | `"Je houdt van gaming en een gezellige community. Gebruik af en toe een emoji."` | Extra beschrijving van de toon of communitykennis, maximaal 2000 tekens. |
| `Birthday.Enabled` | ja/nee | `ja` | Dagelijkse verjaardagscontrole aan- of uitzetten; de commands blijven beschikbaar. |
| `Birthday.CheckTime` | tekst / ID | `"00:00"` | Tijd van de dagelijkse verjaardagsverwerking, in UU:MM. |
| `Birthday.Timezone` | tekst / ID | `"Europe/Amsterdam"` | Tijdzone voor verjaardagsverwerking, bijvoorbeeld Europe/Amsterdam. |
| `Birthday.Role` | tekst / ID | `leeg` | Tijdelijke rol voor de verjaardagskalenderdag; eerdere jarigen verliezen de rol bij een volgende controle. Geeft ook 2× beloningen. |
| `Birthday.Channel` | tekst / ID | `leeg` | Kanaal voor felicitaties. |
| `Birthday.Messages` | lijst | `["Van harte gefeliciteerd met je verjaardag, {user}! 🎉🎂", "Vandaag zetten we {user} in het zonnetje. Gefeliciteerd! 🥳", "Een hele fijne verjaardag gewenst, {user}! 🎈"]` | Felicitatieteksten; `{user}` wordt vervangen door een vermelding van de jarige. |
| `Agenda.Timezone` | tekst / ID | `"Europe/Amsterdam"` | Tijdzone voor de ingevoerde agenda-datum en tijd. |
| `Agenda.Title` | tekst / ID | `"📅 YouTube-planning"` | Titel van de YouTube-planning. |
| `Agenda.YouTubeUrl` | tekst / ID | `"https://www.youtube.com/@troys-game-community"` | Volledige YouTube-link in de planning; leeg/geen verwijdert de link. |
| `Agenda.MaxVisibleItems` | getal | `80` | Maximumaantal zichtbare agendapunten; de weergave begrenst dit ook op wat in de embeds past. |
| `Welcome.Enabled` | ja/nee | `ja` | Welkomstbericht voor nieuwe leden aan- of uitzetten. |
| `Welcome.Channel` | tekst / ID | `leeg` | Kanaal waarin het welkomstbericht verschijnt. |
| `Welcome.Message` | tekst | Standaard welkomsttekst | Tekst met de invulvelden uit het hoofdstuk /welkomstbericht. Gebruik /welkomstbericht instellen om deze te wijzigen. |
| `Welcome.AutoRole` | tekst / ID | `leeg` | Rol die nieuwe leden bij binnenkomst krijgen; wordt onafhankelijk van Welcome.Enabled toegepast. |
| `Leave.Enabled` | ja/nee | `ja` | Vertrekberichten aan- of uitzetten. |
| `Leave.Channel` | tekst / ID | `leeg` | Kanaal voor vertrekberichten. |
| `StartupMessageScan.ProcessMissedXP` | ja/nee | `ja` | Tijdens de opstartscan ook XP toekennen voor gemiste berichten. |
| `StartupReport.Enabled` | ja/nee | `ja` | Opstartrapport in Discord aan- of uitzetten. |
| `StartupReport.Channel` | tekst / ID | `leeg` | Kanaal voor opstartmelding en scanresultaat. |

Je kunt ook een eigen levelrol instellen, bijvoorbeeld met `Levels.Roles.15` voor level 15. Voor rollen en kanalen kun je een vermelding of ID invullen. Gebruik `leeg` om een ondersteunde rol-, kanaal- of lijstinstelling leeg te maken. Scheid meerdere lijstwaarden met komma’s. Bij `Birthday.Messages` scheid je felicitatieteksten met een verticaal streepje (`|`).

## Verjaardagen en dubbele beloningen

Met `/setbirthday` sla je je geboortedatum op. De standaardtijd voor felicitaties en nieuwe verjaardagsrollen is **00:00, Europe/Amsterdam**. Een opgeslagen servertijd blijft geldig na een update. Zet een bestaande server daarom zo om:

```text
/config instellen instelling:Birthday.CheckTime waarde:00:00
/config instellen instelling:Birthday.Timezone waarde:Europe/Amsterdam
```

De rol geldt voor de **verjaardagskalenderdag tot de volgende middernacht**, niet voor een timer van precies 24 uur na toekenning. Oude rollen worden bij de volgende controle verwijderd, ook wanneer die dag al een felicitatie is verstuurd. Als de bot offline is, gebeurt dit zodra hij weer beschikbaar is. `Birthday.Enabled` moet aanstaan. De bot moet leden kunnen ophalen en de verjaardagsrol kunnen beheren.

De ingestelde verjaardagsrol en een voor de bonus aangewezen VIP-rol geven **2×** de volgende nieuwe beloningen. Beide rollen tegelijk geven nog steeds 2×.

| Beloning of actie | Bonus |
| --- | --- |
| Normale chat-XP | 2× |
| XP voor correct tellen | 2×; Levels.Enabled moet aanstaan |
| Ingehaalde XP tijdens opstartscan | 2× op basis van de huidige rollen; historische rollen zijn niet beschikbaar |
| `/daily` | 2× geld; basis €500–€1000, met bonus €1000–€2000 |
| `/work` | 2× geld; basis €50–€500, met bonus €100–€1000 |
| `/give`, `/pay`, rekeningen, stelen, storten, opnemen, startsaldo | Geen bonus |
| Handmatige XP-aanpassingen | Geen bonus |

De wachttijden blijven gelijk. Bestaande XP en saldi worden niet achteraf verdubbeld. Niet iedere rol met de naam VIP geeft automatisch een bonus; vraag een beheerder welke VIP-rol hiervoor is aangewezen.

## Ticketpanelen en transcripts

Na `/ticket-panel` verschijnt een instelscherm waarin je de Discord-doelcategorieën voor de ticketonderwerpen kiest. De algemene terugval is `Tickets.Category`. Per onderwerp kun je een minimumstaffrol kiezen; de selectie gebruikt de ingestelde `StaffRoles` en hun rolvolgorde. Een minimumrol vereist ook een categorienaam.

Tickets ondersteunen een eigen staff-thread en gebruiken het ingestelde maximum `Tickets.MaxOpenPerUser` (schone standaard: 5). `/ticket-close` stuurt de eigenaar een transcript; ticketmeldingen en transcriptkopieën gebruiken `Tickets.LogChannel` indien bereikbaar. Een transcript is een overzicht van het ticketgesprek. Automatisch sluiten is momenteel niet actief; sluit tickets handmatig.

## Meldingen over botupdates

Na een botupdate verschijnt automatisch een overzicht van de wijzigingen in het ingestelde logkanaal. Voor beheerders zijn hiervoor twee instellingen van belang:

```text
/config instellen instelling:Logging.Enabled waarde:ja
/config instellen instelling:Logging.Channel waarde:#jouw-logkanaal
```

Vul bij het tweede command het gewenste kanaal in. De bot moet daar berichten, embeds en bijlagen kunnen plaatsen. Bij dezelfde botversie verschijnt niet bij iedere herstart opnieuw een updatebericht. Lukt het versturen niet, dan probeert de bot het later opnieuw.

Op Troy’s Game Community pas je deze waarden vanaf versie 2.4.8 aan in
`config/defaults.js`; de bovenstaande instelcommands wijzigen daar niets. Gebruik `/config bekijken`
om de bestandsinstellingen te bekijken. Naast de Discord-changelog controleert
de bot GitHub bij het opstarten en iedere zes uur. Een beschikbare nieuwere
versie wordt met een downloadlink in de botconsole gemeld.

## AI-chat gebruiken

De AI draait via GroqCloud. De boteigenaar stelt de API-sleutel in bij de hosting; zie `GROQ-INSTALLATIE.md`. Je pc hoeft niet aan te blijven. De ingestelde AI-berichten en beperkte eerdere gespreksrondes worden bij Groq verwerkt. Bij een gebruikslimiet volgt een melding en pauzeert de AI tijdelijk.

Stuur een gewoon tekstbericht in een kanaal waar AI-chat is ingeschakeld. In de modus `all` reageert de bot op gewone berichten; in de modus `mention` moet je de bot vermelden. Tussen antwoorden kan een wachttijd gelden.

Beheerders kiezen de kanalen met `AIChat.Channels` en schakelen antwoorden in met `AIChat.Enabled`. De toon van de bot is instelbaar via `AIChat.Personality`. De bot reageert niet met AI in het telkanaal.

Krijg je een melding dat de AI niet beschikbaar is? Probeer het later opnieuw of meld het bij een beheerder.

## Tickets en rollen gebruiken als lid

**Ticket openen:** ga naar het ticketpaneel en kies het onderwerp dat bij je vraag past. Volg de aanwijzingen van de bot. Je kunt standaard maximaal vijf tickets tegelijk open hebben; de server kan een ander maximum instellen.

**Rol kiezen:** ga naar het selfrolpaneel en klik op de gewenste knop. De bot bevestigt welke rol je hebt gekregen. Klik nogmaals op dezelfde knop om de rol te verwijderen. Je kunt meerdere beschikbare rollen kiezen.

## Als iets niet lukt

| Situatie | Wat kun je doen? |
| --- | --- |
| Een command ontbreekt of je hebt geen toestemming | Controleer of je de juiste bot kiest en vraag een serverbeheerder of je de benodigde rol hebt. |
| Je kunt nog geen nieuwe beloning claimen | Wacht tot de aangegeven wachttijd voorbij is. |
| Een rolknop geeft een fout | Probeer het actuele paneel of meld het bericht bij een beheerder. |
| Je kunt geen ticket openen | Controleer hoeveel tickets je al open hebt. Vraag staff om hulp als het blijft misgaan. |
| De verjaardagsrol blijft staan | Vraag een beheerder om de verjaardagsinstellingen en rolrechten te controleren. |
| Welkomstbericht verschijnt niet | Controleer Welcome.Enabled, het welkomstkanaal en de botrechten. Bekijk de tekst met /welkomstbericht voorbeeld. |
| De bot reageert helemaal niet | Controleer of de bot online is en meld het probleem bij staff. |

Vermeld bij een probleem welk command of welke knop je gebruikte en stuur de foutmelding of een screenshot mee.


## Creatormeldingen (nieuw in 2.5.2)

Met `/notify` stel je een Discordkanaal in per YouTube- of TikTokaccount. Nieuwe video’s worden automatisch gemeld. Meerdere creators zijn mogelijk. Alleen Head Admin, Owner en Developer mogen toevoegen, verwijderen, wijzigen, bekijken en testen.

Gebruik `/notify lijst`, `/notify toevoegen`, `/notify verwijderen` en `/notify test`. TikTok vereist eerst toestemming van de creator. Zie [NOTIFY-HANDLEIDING.md](NOTIFY-HANDLEIDING.md) voor de volledige uitleg en installatie.
