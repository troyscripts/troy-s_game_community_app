# Gedeelde notify-hub — 3.7.0

## Wat verandert er?

Iedere server blijft creators toevoegen met `/notify toevoegen`. De hoofd-hub bewaart één gedeelde creatorbron. Een profiel-URL, handle of accountnaam wordt eerst genormaliseerd: bijvoorbeeld `https://www.twitch.tv/Creator` en `@creator` gebruiken dezelfde bron. YouTube-handles en UC-kanaal-ID’s worden gekoppeld zodra de hub het kanaal bij YouTube heeft herkend. Zolang die herkenning nog niet lukt, kunnen zulke verschillende schrijfwijzen tijdelijk aparte bronnen zijn; na herkenning worden ze samengevoegd.

De hub controleert een bron ongeveer iedere vijf minuten wanneer een aangesloten bot hem opvraagt. Gelijktijdige aanvragen delen dezelfde platformcontrole. De eerste controle kan nog bezig zijn; de bot probeert het dan na ongeveer dertig seconden opnieuw. Platformfouten staan bij `/notify lijst`.

## Bestaande cloud/hub key

Er is geen tweede sleutel of poort nodig. De nieuwe acties gebruiken de bestaande versleutelde hubverbinding: `BROADCAST_SECRET`, `BROADCAST_URL`, `BROADCAST_BOT_IDS`, de vaste centrale bot-ID en de bestaande bind/poortinstellingen. `BROADCAST_ENABLED=true` activeert de koppeling. `NOTIFY_HUB_ENABLED` is standaard aan, ook als die regel nog niet in een bestaande .env staat. Met `NOTIFY_HUB_ENABLED=false` gebruikt een installatie expliciet de oude zelfstandige notify-werking; deduplicatie tussen bots geldt dan niet.

De hubsleutel geeft toegang aan vertrouwde botinstallaties. Deel hem alleen met de bots die je beheert; geef een onbekende derde geen kopie van die sleutel.

## Updatevolgorde

1. Stop tijdelijk de gekoppelde bots en maak een backup van hun databases en .env-bestanden.
2. Werk eerst de hoofd-hub bij naar 3.7.0 of nieuwer. Bewaar de bestaande database en hubsleutel.
3. Zorg dat de hoofd-hub de benodigde platformkoppelingen heeft: Twitch-appgegevens, eventueel YouTube API-key, en geautoriseerde TikTok-accounts met hun tokenbestand. Deze gegevens worden niet automatisch van andere bots gekopieerd. Ontvangende bots hebben voor centrale notify geen eigen platformtokens nodig.
4. Start de hub en werk de andere bots bij. Start deze met hun bestaande hub-URL, sleutel en toegestane bot-ID’s. Je hoeft creators niet opnieuw toe te voegen: bestaande rijen worden bij hun eerstvolgende controle aan de hub gekoppeld.
5. Controleer `/notify lijst` en gebruik `/notify test` om de eigen Discordbestemming te controleren. Een testbericht wordt bewust apart geplaatst, zonder ping; het is geen platform- of deduplicatietest.

Oude botversies doen nog zelfstandige platformcontroles. De bescherming tussen bots is pas actief zodra alle betrokken bots zijn bijgewerkt en centrale notify gebruiken. Reeds geposte berichten worden niet terugwerkend aangepast of verwijderd.

## Eigen instellingen blijven bestaan

Het Discordmeldingskanaal, de pingrol/pingkeuze, berichttekst en lokale videovoortgang blijven per server opgeslagen. De hub verspreidt niet automatisch alle creators naar alle servers: een server ontvangt alleen zijn eigen gekozen creators. Opnieuw toevoegen van een herkende bron werkt de eigen instellingen bij. Verwijderen stopt alleen de koppeling in die server, niet de gedeelde bron of de koppeling bij andere bots.

De hub bewaart creatorbronnen, bekende aliassen, platformresultaten en afleverreserveringen in zijn bestaande SQLite-database. Iedere bot bewaart zijn serverinstellingen en ontvangstbewijzen lokaal. Alle schemawijzigingen zijn automatisch en bewaren bestaande instellingen. API-sleutels en tokens worden niet in de hubantwoorden opgenomen.

## Geen dubbele links

De hub reserveert iedere combinatie van Discordserver, doelkanaal, platform en video-/stream-ID één keer. Twee bots in hetzelfde doelkanaal versturen zo samen één melding. Dezelfde video mag wel in verschillende doelkanalen verschijnen. Een nieuwe Twitch-livestream krijgt een eigen stream-ID en wordt opnieuw gemeld, ook als de profiel-URL dezelfde blijft.

Na een geslaagde verzending wordt het resultaat eerst lokaal opgeslagen en daarna bevestigd aan de hub. Een verloren bevestiging leidt tot een nieuwe bevestigingspoging, niet tot een nieuw bericht. Een definitieve Discord-weigering, zoals ontbrekende rechten, laat een nieuwe poging na herstel toe.

Bij een onzekere uitkomst (bijvoorbeeld een netwerk-timeout na het versturen of een herstart tijdens verzending) kan niet betrouwbaar worden vastgesteld of Discord het bericht al heeft geplaatst. De melding wordt daarom niet automatisch herhaald. `/notify lijst` toont hoeveel onzekere meldingen apart staan; controleer het doelkanaal en plaats een ontbrekende link zo nodig handmatig. Andere meldingen blijven doorgaan. Deze keuze voorkomt dubbele berichten, maar kan bij zo’n onzekere storing een melding overslaan.

De nieuwe versie bewaart expliciet welke meldingen echt zijn verzonden; de recentste honderd daarvan kunnen opnieuw aan de hub worden doorgegeven. Oude historische baseline-items worden nooit als bewijs van een echte verzending geïmporteerd. Bewaar daarom ook de hubdatabase bij updates/herstarts; verwijder of vervang die niet door een oude backup.

## Hub offline of oude hubversie

De bots vallen niet stilzwijgend terug op zelfstandig ophalen en versturen, omdat dat dubbele links kan veroorzaken. Bestaande lokale instellingen blijven bewaard en synchronisatie wordt later opnieuw geprobeerd. Nieuwe toevoegingen geven een fout zolang de hub niet bereikbaar is. Controleer eerst of de hoofd-hub is bijgewerkt en de bestaande hubkoppeling werkt.

De bestaande platformbeperkingen blijven gelden: TikTok vereist toestemming van het account, en YouTube RSS kan slechts een beperkt aantal recente video’s teruggeven. Deze update kan geen ontbrekende platformrechten of verdwenen RSS-items herstellen.
