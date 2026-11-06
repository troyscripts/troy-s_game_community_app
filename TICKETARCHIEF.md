# Ticketarchief — 3.5.0

## Wat wordt gevolgd?

De bot volgt hoofd- en overheidstickets op **Discord-kanaal-ID**, niet op de naam of categorie. Een open ticket naar een andere categorie slepen verbreekt de koppeling niet. Aanwezig staffoverleg wordt op het opgeslagen staffthread-ID gevolgd en apart geëxporteerd. Alle al in de botdatabase geregistreerde open tickets vallen hieronder. Ook nog aanwezige, eerder gesloten ticketkanalen worden meegenomen.

De bot moet toegang tot het kanaal blijven houden: Kanaal bekijken en Berichtgeschiedenis lezen. Bij verplaatsen geen kanaalrechten synchroniseren als daardoor de bot wordt buitengesloten. De bot kan geen berichten lezen uit een kanaal waartoe hij geen toegang heeft. Handmatig gemaakte kanalen die nooit als ticket in de botdatabase geregistreerd zijn, worden niet automatisch tickets.

## Wat wordt bewaard?

- Eerst ontvangen berichttekst, afzender-ID/naam en tijdstip.
- Ontvangen gewijzigde versies, inclusief oorspronkelijke tekst voor zover die ontvangen is.
- Verwijdermeldingen, ook bij het in bulk verwijderen van berichten.
- Bijlagegegevens en de werkelijk gedownloade bestandsinhoud, niet alleen een Discord-link.
- Embedgegevens als leesbare tekst.

Deze gegevens staan in dezelfde SQLite-database als de bot. Nieuwe tabellen worden automatisch aangemaakt. Het archief blijft ook na succesvol sluiten/verwijderen bewaard; er is geen automatische opschoning van bewijsgegevens. Maak regelmatig een databaseback-up en zorg voor voldoende opslagruimte. Kopieer een SQLite-database alleen na stoppen van de bot of via een consistente databaseback-up; let ook op WAL/SHM-bestanden. Upload de database nooit naar GitHub.

## Markeringen in het transcript

**VERWIJDERD BERICHT** toont de bewaarde inhoud met het tijdstip waarop de bot de verwijdermelding ontving. Dit bewijst niet wie op Verwijderen heeft gedrukt; het transcript schrijft de verwijdering niet zonder bewijs aan de auteur toe.

**GEWIJZIGD BERICHT** toont de eerst bewaarde versie en de volgende waargenomen versies afzonderlijk, met wijzigings- en waarnemingstijden. Als de bot alleen de gewijzigde inhoud heeft ontvangen, staat expliciet dat de oorspronkelijke tekst ontbreekt.

**VERWIJDERDE BIJLAGE** verschijnt bij een bestand dat uit de nieuwste bewaarde berichtversie is verdwenen, of bij een bestand van een verwijderd bericht. De opgeslagen kopie blijft downloadbaar in het HTML-transcript. Download het HTML-bestand en open het in een browser; de downloadlinks bevatten de bestandsinhoud zelf. Discordvoorbeelden ondersteunen mogelijk niet alle HTML-downloadfuncties. Bestanden worden niet automatisch uitgevoerd.

Alle datums in het archief zijn ISO-tijdstippen in UTC. Behoud de oorspronkelijke tijdstippen bij beoordeling.

## Bestaande tickets en opstarten

Na installatie begint de bot bij opstarten op de achtergrond met het inlezen van de zichtbare geschiedenis van geregistreerde tickets en staffthreads. Maximaal 5000 zichtbare berichten per kanaal worden bij deze opstartscan verwerkt. Nieuwe berichten worden ondertussen direct vastgelegd. Bij export wordt de dan zichtbare geschiedenis opnieuw opgehaald en samengevoegd met het archief.

Message Content Intent moet in het Discord Developer Portal aanstaan en `MESSAGE_CONTENT_INTENT` mag niet op false staan. Zonder ontvangen berichtinhoud kan de bot die inhoud niet bewaren. Bots en gewone berichtlogfilters sluiten ticketberichten niet uit van dit aparte archief.

Berichten/bijlagen die vóór de eerste vastlegging zijn verwijderd, wijzigingen tijdens botuitval en onbereikbare bestanden kunnen niet worden teruggehaald. Ook een extreem snelle verwijdering vóór een geslaagde bijlagedownload kan ontbreken. De bot vermeldt onbekende inhoud en meldt mislukte bijlageopslag in de console. Dit systeem is een archief van ontvangen Discord-gegevens, geen garantie op volledige forensische reconstructie of bescherming tegen iemand met toegang tot de botdatabase zelf.

## Grenzen en fouten

Bijlagen worden met maximaal twee downloads tegelijk opgehaald, uitsluitend van de Discord-CDN, met 30 seconden downloadtimeout. Maximaal 25 MB per bestand en 100 MB opgeslagen bijlagen per kanaal. Bij export wordt een mislukte download opnieuw geprobeerd. Mislukt dit alsnog, dan wordt automatisch sluiten/verwijderen geblokkeerd.

De bestaande exportgrenzen blijven gelden: maximaal 5000 berichten en maximaal 8 MB HTML-uitvoer, inclusief ingebedde bijlagen. Base64 maakt bestanden ongeveer een derde groter. Grote bewijsarchieven blijven in de database staan; de bot verwijdert het ticket niet en vraagt om handmatige veiligstelling. Verwijder zulke tickets niet handmatig voordat het volledige archief veilig is geëxporteerd.

## Sluiten en logkanalen

Zowel hoofd- als overheidstickets vragen sluitbevestiging. Eerst worden de benodigde transcripten in de ingestelde logkanalen afgeleverd; daarna wordt het ticketkanaal verwijderd. Hoofdticketgesprekken en overheidstickets gaan naar `Tickets.LogChannel`. Staffoverleg van hoofdtickets gaat alleen naar het afzonderlijke `Tickets.ThreadLogChannel`, niet in de DM of het gewone transcript van de aanvrager. Bij een fout blijven de kanaalgegevens behouden voor een nieuwe poging.

Een mislukte DM aan de aanvrager blokkeert verwijderen niet als de vereiste logs wel zijn afgeleverd. De bestaande botstaff-/claimrechten voor hoofdtickets en expliciete afdelingsrechten voor overheidstickets blijven ongewijzigd.

## Eigen stafftickets

Een bevoegd stafflid kan ook het eigen supportticket claimen, sluiten en deelnemers toevoegen. Gebruik `/ticket-add gebruiker:@persoon` om iemand rechtstreeks uit te nodigen. Ook gelijk/hoger staff kan op die manier worden uitgenodigd en meepraten. Deze expliciete deelnemers worden in de ticketdatabase bewaard. Het toevoegen via een hele rol blijft aan de bestaande rangregels gebonden. Gewone niet-staffticketmakers krijgen geen beheerrechten. Hogere claims, minimumrang en bescherming tegen het verwijderen van hogere staff blijven gelden. Staffoverleg is alleen beschikbaar met de bestaande stafftoegang, ook wanneer het stafflid zelf de aanvrager is; de aparte stafflog/DM-scheiding blijft behouden.
