# Update 3.1.9

Dit is het volledige botpakket. Upload de inhoud van de map naar de bestaande projectmap.
Bewaar je bestaande .env, database en persoonlijke bestanden in data/. Vervang geen live database.
Stop de bot voor het bijwerken, voer `npm ci --no-audit --no-fund` uit en start de bot opnieuw.
Bij hosting die npm ci automatisch uitvoert volstaat uploaden/committen en herstarten.
Er zijn geen nieuwe slashcommands of configvelden; opnieuw deployen van commands is niet nodig.

## Aanpassingen
- Schone installatie: de ontbrekende optionele opusscript 0.0.8-dependency van prism-media staat nu in package-lock.json. De bestaande directe opusscript 0.1.1-dependency blijft behouden.
- Radio: wisselen binnen hetzelfde spraakkanaal behoudt de verbinding. Oude listeners worden bij hergebruik verwijderd. Vertraagde callbacks van een oude sessie stoppen de nieuwe sessie niet.
- Radio: verwachte afsluitmeldingen na stoppen/wisselen worden niet als waarschuwing weergegeven. Fouten van de actieve stream blijven zichtbaar.
- Notify: servernaam, server-ID en accountnaam in waarschuwingen en herstelmeldingen.
- Notify: afwisselende HTTP 404/5xx-waarschuwingen maximaal eenmaal per uur per creator tijdens een doorlopende foutperiode; controles blijven met oplopende wachttijd doorgaan. Na herstel of handmatig opnieuw proberen begint een nieuwe foutperiode.
- YouTube: na HTTP 404/5xx wordt dezelfde feed op de alternatieve YouTube-host geprobeerd. Ook daar wordt de kanaalidentiteit gecontroleerd; een mislukte feed wordt nooit als lege succesvolle feed opgeslagen.
- YouTube: gevonden kanaal-ID blijft bewaard als de feed mislukt; foutmeldingen bevatten het opgevraagde pad en kanaal-ID.
- Twitch: een lege gebruikerslijst, een ongeldig antwoord en een afwijkend account geven verschillende meldingen met de ingestelde gebruikersnaam.

## Nog extern controleren
De YouTube-uitwijkmogelijkheid kan helpen bij hostspecifieke fouten, maar beide hosts kunnen naar dezelfde infrastructuur verwijzen. Een blijvende 404/500 is hiermee niet gegarandeerd opgelost. Gebruik de nieuwe meldingen om het exacte kanaal/feedverzoek te controleren.
Twitch #52 moet bij een blijvende fout aan de hand van de nu gelogde gebruikersnaam worden nagekeken; de logs bewijzen niet dat het account verwijderd is.
TikTok blijft een geldige accountkoppeling vereisen.
Een radiostream die 404, timeout of Network is unreachable geeft, moet met de juiste stream-URL en vanaf de hosting worden gecontroleerd. Er zijn geen zender-URL's gewijzigd.
De bestaande code wacht al op de afspeelstatus voordat 'gestart' wordt gelogd; een stream kan ook kort daarna alsnog uitvallen.

## Uitgevoerde controles
- Node.js 22.23.4 / npm 10.9.9: schone npm ci-installatie geslaagd; syntax-, versie- en alle 20 testbestanden geslaagd (platformtest na aanpassing opnieuw uitgevoerd).
- Node.js 24.22.1 / npm 11.9.0: schone npm ci-installatie en volledige npm run ci geslaagd: 20/20 testbestanden.
- Laatste radio-aanpassing opnieuw getest op beide Node-versies.
- Echte PCM-naar-Opus-encoding via @discordjs/voice geslaagd op beide Node-versies.
- Discord-verbindingen, YouTube/Twitch-antwoorden en zenderwissels zijn in regressietests gesimuleerd. Geen live Discord-login of live radioluistertest uitgevoerd.
- Geen dependencyversies gewijzigd buiten het toevoegen van de ontbrekende lockfile-entry; npm geeft bestaande deprecationmeldingen voor glob/prebuild-install.

## Gewijzigde bestanden
- CHANGELOG.md
- README.md
- locales/en.json
- package-lock.json
- package.json
- scripts/test-notify.cjs
- scripts/test-platform-request.cjs
- scripts/test-radio.cjs
- services/notify/providers.js
- services/notify/twitch.js
- services/notifyService.js
- services/radioService.js
- UPDATE-3.1.9.md

## Documentatiecorrectie vóór publicatie

De onderstaande handleidingen zijn aangevuld voor 3.1.9. Het losse documentatiepakket bevat uitsluitend Markdown-bestanden op hun bestaande paden. Pak het uit in de projecthoofdmap en vervang die bestanden voordat je publiceert. De botcode en versie veranderen niet; hiervoor is geen npm-installatie of commandodeploy nodig. Het volledige pakket is eveneens bijgewerkt.

- README.md
- HANDLEIDING.md
- MANUAL-EN.md
- RADIO-HANDLEIDING.md
- NOTIFY-HANDLEIDING.md
- TWITCH-HANDLEIDING.md
- INSTALLATIE.md
- GITHUB-INSTALLATIE.md
- LEES-MIJ-VOLLEDIGE-VERSIE.md
- CONTROLES.md
- LOGGING-HANDLEIDING.md
- SOFTMODERATIE.md
