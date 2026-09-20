# GitHub voorbereiden — update 2.4.7

Dit pakket bevat alleen nieuwe of gewijzigde bestanden voor de aangeleverde
2.4.6-bot. Het is geen volledige botinstallatie. Voeg mappen samen en vervang
alleen de meegeleverde bestanden.

## 1. Voor het vervangen

Stop de bot en maak privé een backup. Bewaar `.env` en je database.
Neem vóór het vervangen eventuele globale Owners/Developers uit je oude
`config/defaults.js` over naar `OWNER_IDS`/`DEVELOPER_IDS` in je bestaande `.env`.
Dit moeten gebruikers-ID’s zijn, geen rol-ID’s. Neem de VIP-rol-ID’s uit
`config/rewardBonuses.js` over naar `VIP_ROLE_IDS` (komma’s tussen meerdere ID’s).
Voeg deze regels toe; overschrijf niet je bestaande `.env` met het lege voorbeeld.

De oude Owners-lijst in de aangeleverde zip gebruikte hetzelfde ID als de
Owner-rol. Kopieer die waarde dus niet blind als gebruikers-ID.

Opgeslagen serverinstellingen blijven in de database staan. Als je instellingen
alleen in defaults had ingevuld en nog niet in de database hebt opgeslagen, noteer
ze privé en stel ze na de update opnieuw in via `/config`. Controleer ook
`Agenda.YouTubeUrl`; de persoonlijke standaardlink is verwijderd.

## 2. Update toepassen

Pak dit updatepakket uit in je bestaande botmap en voeg de mappen samen.
Nieuwe dependencies zijn niet nodig. Test met `npm run check` en
`npm run test:updates`, start vervolgens met `npm start`.
Logging moet aanstaan en `Logging.Channel` moet bereikbaar zijn voor de
automatische changelogmelding van 2.4.7.

## 3. Hier vul je de GitHub-link in

Open `config/updates.js` en wijzig alleen de lege Repository-waarde:

```js
Repository: "https://github.com/JOUW_ACCOUNT/JOUW_BOT",
```

Ook `JOUW_ACCOUNT/JOUW_BOT` is toegestaan. Vul de echte link in vóór publiceren,
zodat downloads direct naar de juiste repository kijken. Er is geen persoonlijke
GitHub-token nodig. Optioneel overschrijft `GITHUB_REPOSITORY` in `.env` de link
voor die ene installatie. `UPDATE_CHECK_ENABLED=false` zet die lokale controle uit.
Na wijzigen de bot herstarten.

De controle draait bij opstarten en iedere zes uur. Bij fouten blijft de bot werken;
de volgende geplande controle probeert opnieuw. De melding verschijnt in de
console en bevat een link naar de release. Er worden geen botbestanden gedownload,
uitgevoerd of automatisch vervangen.

## 4. Maak de openbare map

Voer in de bijgewerkte botmap uit:

```text
npm run prepare:github
```

Er verschijnt een nieuwe map `github-export-...`. Upload **alleen de inhoud van
die map** naar de hoofdmap van je GitHub-repository. Ook `.env.example` en
`.gitignore` moeten mee. `package.json` hoort direct in de repository-hoofdmap.
De export start de bot niet en kopieert geen `.env`, databases, backups, logs,
tickettranscripts, node_modules, archieven of Git-geschiedenis. De oorspronkelijke
privébestanden blijven bestaan. Maak bij wijzigingen een nieuwe export en gebruik
de nieuwste map. Bekijk de inhoud zelf voordat je publiceert.

De export weigert herkenbare vaste Discord-ID’s en enkele veelgebruikte
tokenformaten. Het is geen universele scanner voor namen of zelfbedachte sleutels.
Eigen privégegevens horen uitsluitend in `.env` en de database.

**Bij handmatig samenstellen:** verwijder uit de publicatiekopie de volledige
map `transcripts/` (de aangeleverde zip bevat drie persoonlijke tickettranscripts).
Laat ook `.env`, databasebestanden, backups, logs en node_modules weg. Verwijder
niet de map `database/` met de JavaScript-bronbestanden.
Een update-zip verwijdert oude bestanden niet automatisch.

`.gitignore` beschermt niet tegen handmatig uploaden of eerder gecommitteerde
bestanden. Zijn persoonlijke bestanden al gepubliceerd, verwijder ze ook uit de
Git-geschiedenis. Vervang eventueel gepubliceerde tokens. Deze update publiceert
zelf niets en verandert geen bestaande repository.

## 5. Publiceer een release

Maak je repository openbaar en publiceer een gewone release met tag `v2.4.7`.
Markeer die als Latest; geen draft of prerelease. Alleen bestanden uploaden of
een losse Git-tag aanmaken is niet voldoende voor deze checker.

Bij een volgende update: verhoog package.json en de projectversies in
package-lock.json, voeg het bijpassende hoofdstuk bovenaan CHANGELOG.md toe,
upload de wijzigingen en publiceer bijvoorbeeld `v2.4.8` als Latest-release.
config/defaults.js haalt de versie automatisch uit package.json.

API-documentatie: https://docs.github.com/en/rest/releases/releases#get-the-latest-release

## Controle van de aangeleverde zip

Gevonden en uit de bijgewerkte openbare bronbestanden verwijderd:
- Server-, kanaal- en rol-ID’s in defaults en rewardBonuses.
- Een vast server-ID in het herstelscript.
- Het VIP-rol-ID en de persoonlijke YouTube-link in de changelog.
- De persoonlijke YouTube-link in de standaardconfiguratie.
- Persoonlijke aanspreeknaam in AI-foutmeldingen en naam in testdata.

Drie HTML-tickettranscripts met gebruikersgegevens blijven in de oorspronkelijke
zip staan; ze worden uitgesloten door de export. Niet rechtstreeks uploaden.
In de aangeleverde zip zijn geen .env, databasebestanden of herkenbare echte
bot-/API-tokens aangetroffen. De projectnaam Troy’s Game Community blijft bewust
als productnaam/auteursvermelding behouden.

Ontbrekende .env.example en .gitignore zijn toegevoegd. De README verwees naar
oude handleidingen die niet in de zip zaten; deze verwijzingen zijn vervangen
door beschikbare actuele instructies. Lokale moduleverwijzingen zijn gecontroleerd.
De volledige bot is niet live met Discord of een echte repository getest.
