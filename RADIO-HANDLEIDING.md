# Internetradio — 3.1.8

## Installeren
1. Stop de bot en pak het pakket uit over de botbestanden. Bewaar je `.env`, database en eigen gegevens.
2. Gebruik Node.js 24 (minimaal 22.12.0) en voer `npm ci` uit. Dit installeert ook de voice-, Opus- en FFmpeg-pakketten. Gebruik geen `--ignore-scripts` in productie.
3. Herstart de bot. Commands worden via de bestaande registratie bijgewerkt; eventueel `npm run deploy` uitvoeren.
4. Geef de bot in het spraakkanaal **Kanaal bekijken**, **Verbinden**, **Spreken**, **Berichten verzenden** en **Links insluiten**. Voor slashcommands hebben gebruikers **Applicatieopdrachten gebruiken** nodig.
5. Ga in een server-spraakkanaal zitten, open de bijbehorende chat en gebruik `/radio paneel`.
6. Kies een zender uit de dropdown. De bot komt in de call en iedereen hoort dezelfde radio.

Een Discord-groepsgesprek via privéberichten en Stage-kanalen worden niet ondersteund. Per server kan de bot één radiokanaal tegelijk bedienen. Meerdere servers kunnen ieder hun eigen zender afspelen.

## Paneel
- Dropdown: starten of wisselen tussen ingestelde zenders.
- Zachter / Harder: telkens 10 procentpunten, tussen 0 en 100%.
- Nu luisteren: actuele zender, kanaal en volume in een privéantwoord.
- Stop radio: audio stoppen en de call verlaten.

Het paneel is openbaar en blijft bruikbaar na een botrestart. Audio hervat na een restart niet automatisch. Bedieningsbevestigingen zijn privé. De knoppen en dropdown werken alleen voor leden die in het kanaal van het paneel zitten. Bij een leeg kanaal stopt de bot standaard na 60 seconden. Bij verbindingsverlies of einde van de stream stopt hij; kies opnieuw een zender om opnieuw te verbinden.

Het paneel bevat geen voortdurend bijgewerkte afspeelstatus; **Nu luisteren** toont de huidige toestand. Na wijzigingen aan zendernamen of toevoegingen plaats je een nieuw paneel met `/radio paneel`. Oude paneelkeuzes gebruiken altijd de huidige URL uit de configuratie.

## Zenders en configuratie
Twaalf zenders zijn vooraf ingevuld: Radio 538, 538 Non Stop, 538 Dance Department, Qmusic, Qmusic Nonstop, Qmusic Thema, Qmusic Top 40, Qmusic Nederlandstalig, Qmusic 90s & 00s, NPO Radio 5, NPO Klassiek en Radio Veronica.

Er zijn maximaal 25 plaatsen. Een botowner of beheerder met **Server beheren** kan `/radio instellen zender:12 naam:Mijn radio url:https://...` gebruiken. Gebruik een directe MP3/AAC-stream, geen webpagina, YouTube-link of M3U/PLS-bestand. Nederland.fm is de inspiratie voor de zenderkeuze; de bot speelt directe streams en gebruikt geen Nederland.fm-account of API.

Via de bestaande `/config instellen` zijn deze instellingen per server beschikbaar:

| Instelling | Opties |
| --- | --- |
| Radio.Enabled | ja/nee; nieuwe starts en volumewijzigingen aan/uit |
| Radio.DefaultVolume | heel getal 0–100; standaard 30 |
| Radio.EmptySeconds | heel getal 5–3600; standaard 60 |
| Radio.Stations.Station1.Name | zendernaam, maximaal 80 tekens |
| Radio.Stations.Station1.Url | directe HTTP(S)-stream; `geen` maakt het slot leeg |

Station1 tot en met Station25 werken hetzelfde. Volume en wachttijd worden bij starten/wisselen ingelezen. Uitschakelen beëindigt bestaande audio niet automatisch: gebruik ook Stop. Een beheerder kan `/radio stop` vanuit een ander kanaal uitvoeren.

`/leave` stopt de radio, beëindigt het FFmpeg-proces en verwijdert de bot direct uit het spraakkanaal. Luisteraars gebruiken dit vanuit hetzelfde spraakkanaal; beheerders mogen dit ook elders uitvoeren.

Alternatieve slashcommands: `/radio start`, `/radio stop`, `/radio volume`, `/radio status`, `/radio lijst`.

## Hosting en oplossen van fouten
Node.js 24 past bij de gebruikte hosting. FFmpeg wordt via npm meegeïnstalleerd; als de download op je host wordt geblokkeerd, laat FFmpeg door de host installeren en beschikbaar maken op PATH. Discord voice vereist uitgaand UDP. De host moet ook de HTTP(S)-radiostreams kunnen bereiken. Een servermute moet door een beheerder worden opgeheven.

Consolelogs beginnen met `[Radio]` en vermelden servernaam plus server-ID. Bij een startfout: controleer de stream, Discordrechten, FFmpeg en netwerktoegang. De bot stopt en ruimt de verbinding en FFmpeg op als de stream faalt. URL's en eventuele tokens worden niet in radiologs geschreven.

## Bronnen voor de meegeleverde streams
- https://www.538.nl/538-algemeen/zo-luister-je-naar-radio-538
- https://qmusic.nl/hier-vind-je-alle-stream-urls-van-qmusic
- https://www.nporadio5.nl/luisteren
- https://www.npoklassiek.nl/streams

Streams kunnen door de omroep gewijzigd worden; beheerders kunnen de URL per server aanpassen.

## Controle
`npm run ci` controleert syntaxis, versies en regressietests. `npm run test:radio` controleert configuratie, paneel, kanaalrechten, serverisolatie en het opruimen van audiosessies met nagebootste Discordverbindingen. Echte audio in jouw Discordcall moet na installatie worden getest; hiervoor zijn een actieve botverbinding en de hostingomgeving nodig.

## Radio Veronica / update 3.1.8
De website `https://www.radioveronica.nl/` is geen audiostream. De bot herkent vanaf 3.1.8 deze homepage (ook met trackingparameters) en gebruikt de directe stream. Dit geldt ook voor eerder opgeslagen Veronica-homepagelinks.

Directe stream: `https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICA.mp3`

Veronica is standaard zender 12 voor nieuwe serverconfiguraties. Bestaande opgeslagen zenderplaatsen worden niet overschreven. Voeg hem daar zo toe (kies een vrij of te vervangen zendernummer):
`/radio instellen zender:12 naam:Radio Veronica url:https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICA.mp3`
Plaats daarna een nieuw `/radio paneel` om de gewijzigde dropdown te zien.

FFmpeg-fouten bevatten nu ook zendernaam en afgeschermde foutdetails. De proxycorrectie is getest met echte streams; de oorzaak op jouw hosting kan alleen uit de nieuwe foutmelding worden vastgesteld als de directe stream nog niet werkt.
