# Overheidstickets — 3.5.0

Dit is een extra systeem naast de bestaande supporttickets. De afdelingen zijn gebaseerd op de screenshots en de template GemertRP Overheid. Het systeem werkt ook op andere servers: koppel altijd de rollen en categorieën van die server. Template-ID's worden niet gebruikt.

## Installeren

Gebruik Node.js **24.x**. Zet vóór installatie het hostingprofiel om en volg [UPDATE-3.4.0.md](UPDATE-3.4.0.md).

1. Stop de bot en maak een back-up van de database en configuratie.
2. Vervang de programmabestanden. Bewaar je eigen `.env`, database en bestaande configuratie. Er zijn geen nieuwe environmentvariabelen nodig.
3. Voer `npm ci` uit en start de bot. Nieuwe tabellen worden automatisch aangemaakt.
4. De bot registreert slashcommands bij opstarten. Indien nodig: `npm run deploy`.
5. Configureer de HeadAdmin-rol voor deze server via de bestaande botconfiguratie. De bestaande toegang voor Owner/Developer en servereigenaar geldt ook voor het instellen. Een gewone Admin- of staffrol geeft geen instelrechten.

## Overheidscoördinator

De vanuit Gemert aangewezen overheidscoördinator heeft een eigen ticketpaneel. Stel dit als Head Admin of hoger in met `/overheidscoordinator instellen:Overheidscoördinator`. Kies de verantwoordelijke persoon en/of diens Discord-rol, selecteer de ontvangstcategorie en activeer het onderdeel. Plaats daarna met `/overheidscoordinator` zonder opties het paneel in het gewenste tekstkanaal.

De coördinator heeft voor het behandelen geen botstaffrol nodig. Deze tickets hebben hun eigen toegangslijst en staan los van de vier diensten. De titel coördinator geeft niet automatisch toegang tot tickets van andere diensten; koppel de persoon of rol daar afzonderlijk als die toegang gewenst is. Claimen, transcript downloaden en sluiten werken hetzelfde als bij de andere overheidstickets.

## Een afdeling instellen

Gebruik `/politie instellen:Interne Zaken` (kies de afdeling uit de commandopties). Voor de andere diensten: `/ambulance`, `/pechhulp`, `/brandweer`.

Het privé-instelbericht heeft keuzelijsten voor:

- **Behandelrollen:** maximaal 10 echte Discord-rollen. Geen staffrol vereist. De lijst vervangt de vorige selectie; leegmaken is toegestaan.
- **Verantwoordelijken:** maximaal 10 personen die ook zonder de behandelrol toegang krijgen. Zij mogen tickets behandelen, maar niet de instellingen aanpassen.
- **Categorie:** de Discord-categorie waarin nieuwe tickets voor deze afdeling worden aangemaakt. Afdelingen kunnen dezelfde categorie delen of ieder een eigen categorie gebruiken.
- **Activeren/uitschakelen:** actief kan alleen met een categorie en minstens één rol of verantwoordelijke. Onvolledig ingestelde afdelingen worden uitgeschakeld.

Selecties worden direct opgeslagen. Gebruik het optionele veld `naam` samen met `instellen` om een afdelingsnaam te wijzigen. De standaardkeuzenaam in het slashcommand blijft gelijk; de aangepaste naam verschijnt op het paneel en in tickets.

Gebruik daarna bijvoorbeeld `/politie` zonder opties in het gewenste tekstkanaal. Daar verschijnt het openbare paneel met de actieve afdelingen. Gebruik na wijzigingen hetzelfde paneelcommando opnieuw in hetzelfde kanaal. De bot werkt het meest recente eigen paneel voor deze dienst binnen de laatste 100 berichten bij. Staat het oude paneel verder terug of in een ander kanaal, dan plaatst de bot een nieuw paneel; verwijder het oude in dat geval zelf via Discord. Uitgeschakelde afdelingen kunnen ook via oude panelen geen nieuwe tickets ontvangen.

Brandweer is voorbereid met voorlopige afdelingen. Alles staat standaard uit; configureer en activeer deze pas zodra de Discord-rollen en categorieën klaar zijn.

## Rechten en werking

Een inwoner die het paneel ziet kan een ticket openen. Alleen de aanvrager, gekozen afdelingsrollen, gekozen verantwoordelijken en de bot krijgen expliciete kanaaltoegang. Rechten van de bovenliggende categorie worden niet overgenomen. Discord-servereigenaren en personen met Administrator behouden door Discord zelf toegang tot alle kanalen.

Behandelknoppen kijken uitsluitend naar de gekoppelde rollen/personen. Botstaff, Head Admin en botowner krijgen daardoor niet automatisch behandelrechten. Selecteer voor leidinggevenden expliciet hun rol of persoon als zij moeten kunnen helpen.

Per persoon is maximaal één open ticket per afdeling mogelijk. Claims kennen één behandelaar toe; andere afdelingsmedewerkers kunnen blijven helpen. Alleen behandelaars kunnen sluiten. De aanvrager en behandelaars kunnen een HTML-transcript downloaden. Transcriptlimieten: 5000 berichten, 8 MB brongegevens/uitvoer en 60 seconden ophalen. Bij overschrijding blijft het ticket behouden.

Sluiten vraagt bevestiging en stuurt automatisch een HTML-transcript naar het al ingestelde **Tickets.LogChannel** van deze Discord-server. Het logbericht vermeldt dienst, afdeling, ticketnaam/ID, aanvrager, behandelaar en degene die sluit, zonder mentions te pingen. Zodra Discord de upload heeft bevestigd, wordt het ticketkanaal direct verwijderd. De bestaande Transcript-knop blijft beschikbaar voor een handmatige privédownload.

Er is geen nieuw logkanaal of staffthread nodig. De bot moet in Tickets.LogChannel kunnen kijken, berichten versturen en bestanden bijvoegen, en in het ticket kunnen lezen en het kanaal verwijderen. Het logkanaal mag niet het ticket zelf zijn. Controleer dat het bestaande logkanaal alleen toegankelijk is voor de mensen die deze gesprekken mogen lezen.

Bij een ontbrekend logkanaal of mislukte export/upload blijft het ticket bestaan. Mislukt alleen verwijderen, dan staat het transcript al in het logkanaal; probeer sluiten opnieuw. De bot maakt dan opnieuw een actueel transcript, zodat latere berichten ook worden meegenomen. Ook eerder gesloten archiefkanalen kunnen via de bestaande sluitknop worden geëxporteerd en verwijderd.

Instellingenwijzigingen gelden voor **nieuwe tickets**. Bestaande tickets bewaren de oorspronkelijk gekoppelde rollen en personen; bezit of verlies van zo'n Discord-rol wordt bij behandelacties opnieuw gecontroleerd. Pas bij wisseling van een rechtstreeks aangewezen persoon ook bestaande kanaalrechten aan of sluit diens oude tickets.

De bot heeft in de doelcategorie nodig: Kanaal bekijken, Kanalen beheren, Rollen beheren (kanaalrechten wijzigen), Berichten verzenden, Berichtgeschiedenis lezen en Bestanden bijvoegen. Geef de bot ook toegang en verzendrechten in het paneelkanaal.

## English quick guide

Use `/politie`, `/ambulance`, `/pechhulp` or `/brandweer` with the `instellen` option to select a department. Choose real Discord roles, responsible users and a destination category, then activate the department. Run the same command without options to publish its panel in the current text channel. Optional `naam` renames the selected department. Setup requires the existing Head Admin or higher access. Handling uses only explicitly assigned department roles/users, never bot staff membership. Settings and tickets persist in SQLite. Existing tickets retain their original role/user assignments. After confirmation, closing uploads the transcript to the existing Tickets.LogChannel and then deletes the ticket channel. Failed export or delivery preserves the channel; retrying after a deletion failure creates a fresh transcript. The new interface is Dutch.

The government coordinator has a separate `/overheidscoordinator` panel with its own roles, responsible users and destination category. No staff membership is required to handle these tickets. Configure it using `instellen`, activate it, then run the command without options to publish.

## Leesbare keuzes en uitleg (3.4.1)

Elke menukeuze toont de afdelingsnaam met daaronder een korte uitleg, bijvoorbeeld Werving & selectie: Solliciteren of vragen over de selectieprocedure. Gebruik `omschrijving` (maximaal 100 tekens) samen met `instellen` om zelf de uitleg te bepalen. Het veld `naam` is voor de zichtbare afdelingsnaam; behandelrollen kies je in het instelscherm.

Heb je eerder een rolmention als naam ingevoerd, dan haalt de bot de echte rolnaam op bij het plaatsen/bijwerken. Ontbreekt die rol, dan verschijnt de standaardafdelingsnaam. Dit wijzigt geen toegangsrechten. Reeds verstuurde Discord-menu's veranderen pas wanneer je het paneelcommando opnieuw uitvoert.

## Hoofdtickets vanaf 3.4.3

Het bestaande hoofdticketsysteem verwijdert nu eveneens na bevestiging en geslaagde logaflevering. Bij hoofdtickets blijft staffoverleg apart in Tickets.ThreadLogChannel; overheidstickets gebruiken geen staffthread. De verschillende behandelrechten blijven gescheiden.

## Ticketarchief vanaf 3.5.0

Ook bestaande overheidstickets blijven gevolgd na verplaatsen. Wijzigingen, verwijderingen en opgeslagen bijlagen verschijnen in het transcript met duidelijke markeringen. Zie [TICKETARCHIEF.md](TICKETARCHIEF.md) voor de werking, beperkingen en back-up van de database.
