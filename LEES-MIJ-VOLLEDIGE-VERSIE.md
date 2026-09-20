# Volledige bot — 2.4.7

Dit is de volledige opgeschoonde broncode, inclusief alle updates van 2.4.7.
Het is geen updatepakket. De bestanden staan direct in de hoofdmap van deze zip.

## Bestaande bot bijwerken

1. Stop de bot en maak een privébackup van je huidige botmap.
2. Bewaar je bestaande .env en databasebestanden: verwijder de bestaande botmap niet.
3. Neem eventuele globale beheerders en VIP-rol-ID’s over naar je lokale .env,
   zoals beschreven in GITHUB-INSTALLATIE.md. Geef gebruikers-ID’s op voor
   OWNER_IDS/DEVELOPER_IDS en rol-ID’s voor VIP_ROLE_IDS.
4. Pak deze zip uit in /home/container en voeg de mappen samen.
   package.json staat dan op /home/container/package.json en updates.js op
   /home/container/config/updates.js. Plaats geen extra tussenmap.
5. De repositorylink staat al in config/updates.js:
   https://github.com/troyscripts/troy-s_game_community_app
   Laat GITHUB_REPOSITORY in .env leeg tenzij je deze bewust wilt overschrijven.
6. Gebruik bij ontbrekende dependencies npm ci en start daarna met npm start.

## Nieuwe installatie

Volg README.md. Kopieer .env.example naar .env en vul je botgegevens in.
Installeer dependencies met npm ci en start met npm start.

## GitHub

Deze volledige zip bevat geen .env, databases, node_modules, logs of persoonlijke
transcripts. .env.example en .gitignore zitten er wel in. Je projectnaam is behouden.
De instructie “alleen gewijzigde bestanden” in GITHUB-INSTALLATIE.md beschrijft het
losse eerdere updatepakket; deze zip is juist de volledige versie.

De openbare repositorylink is al ingevuld in config/updates.js.
Voor export vanuit een gebruikte installatie: npm run prepare:github.
Upload nooit de privédata die later op je host is aangemaakt.

Gecontroleerd: JavaScript-syntax, lokale moduleverwijzingen, aanwezigheid van
config/updates.js en offline tests van de versiechecker. Geen live Discord-test.
