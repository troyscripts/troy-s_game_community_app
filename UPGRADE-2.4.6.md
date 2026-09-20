# Update 2.4.6 — selfrollen

Dit ZIP-bestand bevat alleen nieuwe en gewijzigde bestanden ten opzichte van de aangeleverde 2.4.5.

## Installeren

1. Stop de bot en maak een back-up van je botmap.
2. Pak dit ZIP-bestand uit in de botmap, waar package.json staat. Voeg de mappen samen en vervang de bestanden met dezelfde naam.
3. Voer in die map `npm run check` uit.
4. Voer `npm run deploy` uit om `/selfrollen` te registreren.
5. Start de bot met `npm start`.

Geen nieuwe npm-pakketten nodig. Je .env en database zijn niet opgenomen: behoud je eigen bestanden. De drie nieuwe selfrole-tabellen worden automatisch aangemaakt bij eerste gebruik. De bestaande changelogfunctie meldt 2.4.6 bij opstarten als Logging.Enabled aanstaat en Logging.Channel is ingesteld en bereikbaar.

## Eerste paneel maken

- `/selfrollen maken naam:games` opent een formulier voor titel en volledige tekst boven de knoppen. Regeleinden en Discord Markdown zijn mogelijk.
- `/selfrollen knop paneel:games rol:@FiveM label:FiveM kleur:Blauw emoji:🎮` voegt een knop toe. Kies paneel en rol via de suggesties in Discord.
- Herhaal `knop` voor bijvoorbeeld ATS, ETS2, Minecraft of streams. Een paneel heeft maximaal 25 knoppen.
- `/selfrollen plaatsen paneel:games kanaal:#selfrollen` plaatst het bericht.
- Maak met `maken` meer panelen, bijvoorbeeld meldingen of interesses. Je kunt hetzelfde paneel ook nogmaals plaatsen in een ander kanaal.

## Aanpassen en vervangen

- `tekst`: titel en tekst wijzigen via een formulier; alle exemplaren worden bijgewerkt.
- `knop`: dezelfde rol kiezen om label, kleur of emoji te wijzigen. Weggelaten kleur/emoji behouden de oude waarde. Gebruik `emoji:geen` om de emoji te wissen.
- `knop-verwijderen`: één knop verwijderen. Leden houden een eerder verkregen rol.
- `voorbeeld`: privévoorbeeld met de knoppen als tekst; dit deelt geen rollen uit.
- `lijst`: paneel-ID's, namen, aantallen knoppen en geplaatste berichten.
- `verversen`: alle geregistreerde berichten opnieuw bijwerken, bijvoorbeeld na het herstellen van kanaalrechten.
- `verwijderen bevestigen:Ja`: paneel verwijderen en de knoppen uitschakelen. Ledenrollen blijven behouden. Als een bericht niet bereikbaar is, werken de achtergebleven knoppen niet meer.

Om het oude standaardpaneel te vervangen: maak het nieuwe paneel, voeg de gewenste knoppen toe en gebruik `plaatsen` met het oude kanaal en `bericht-id`. Zet in Discord Ontwikkelaarsmodus aan om via rechtsklikken het bericht-ID te kopiëren. Alleen selfrolberichten van dezelfde bot worden vervangen; andere botberichten worden geweigerd. Niet-vervangen standaardpanelen blijven de bestaande SelfRoles-instellingen gebruiken. Nieuwe panelen gebruiken hun eigen opgeslagen rollen.

## Rechten en logging

Owner-/Developer-toegang uit de bestaande botinstellingen en Discord Administrator mogen beheren. De bot heeft Rollen beheren nodig en zijn hoogste rol moet boven de selfrollen staan. Voor plaatsen/bijwerken: kanaaltoegang, berichten verzenden, berichtgeschiedenis lezen en links insluiten. De beheerder kan alleen rollen onder zijn eigen hoogste rol instellen; de servereigenaar is van die laatste beperking uitgezonderd.

Staffrollen, rollen met beheer-/moderatierechten, beheerde integratierollen en @everyone zijn geen toegestane openbare selfrollen. Deze controle gebeurt opnieuw bij een klik, zodat latere rechtenwijzigingen worden opgemerkt.

Alle selfrolwijzigingen en roltoekenningen/-verwijderingen worden in selfrole_audit opgeslagen, met server, gebruiker, actie, details en tijd. Meldingen als embed verschijnen in het ingestelde Logging.Channel wanneer Logging.Enabled aanstaat. Bestandslogging volgt Logging.Files. Bestaande algemene interactielogs kunnen daarnaast verschijnen.

Als een bericht niet kan worden bijgewerkt, blijven de paneelinstellingen opgeslagen. Herstel de rechten en gebruik `verversen`. Een verwijderde knop kan ook op een nog niet bijgewerkt bericht geen rollen meer uitdelen.

## Controle

Lokaal gecontroleerd op JavaScript-syntax, commandregistratiestructuur, paneelopslag, serverafscheiding, berichtvervanging, rollen wisselen en foutafhandeling met gesimuleerde Discord-interacties. Geen live test in jouw Discord-server uitgevoerd. Test na installatie met een normale testrol: klik eenmaal voor toevoegen en nogmaals voor verwijderen en controleer het logkanaal.
