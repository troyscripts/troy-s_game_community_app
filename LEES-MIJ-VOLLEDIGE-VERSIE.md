# Volledige bot — 3.2.0

## Bijwerken vanaf 3.1.9

Stop de bot, neem de gewijzigde bestanden inclusief `utils/logNames.js` over en herstart. Deze update verandert geen dependencies, configvelden, database-indeling of slashcommands. Bewaar je bestaande `.env`, database en eigen gegevens. Het versieverschil in het lockbestand is alleen het botversienummer. Publiceer deze versie als **v3.2.0**. Zie [UPDATE-3.2.0.md](UPDATE-3.2.0.md). Bij een nieuwe installatie blijft `npm ci --no-audit --no-fund` nodig.

Het volledige pakket bevat de botcode en actuele documentatie in de map `troy-s_game_community_app/`. Een ZIP met alleen handleidingen is uitsluitend een aanvulling en bevat geen botcode.

## Bestaande bot bijwerken

1. Stop de bot en maak een privéback-up van de bestaande installatie.
2. Bewaar `.env`, de SQLite-database inclusief eventuele bijbehorende bestanden en je eigen bestanden in `data/`, waaronder TikTok-tokens.
3. Kopieer de inhoud van de pakketmap naar je bestaande botmap. Op de gebruikelijke hosting staat `package.json` dan op `/home/container/package.json`; maak geen extra tussenmap.
4. Neem `package.json` en `package-lock.json` beide over en voer `npm ci --no-audit --no-fund` uit. Gebruik Node.js 24; minimaal 22.12.0. Kopieer geen `node_modules` van je eigen pc.
5. Start met `npm start` of de startknop van de hosting. Controleer de console, `/ping`, een radiozenderwissel en `/notify lijst`.

Bijwerken van 3.1.8 naar 3.2.0 vereist geen nieuwe configvelden of commandoregistratie. Bestaande serverinstellingen blijven behouden. Als je een oudere versie overslaat, volg ook de relevante functiehandleidingen voor inrichting en commands.

## Nieuwe installatie en publiceren

Volg [INSTALLATIE.md](INSTALLATIE.md). Maak een eigen `.env` op basis van `.env.example`. Volg [GITHUB-INSTALLATIE.md](GITHUB-INSTALLATIE.md) voor publicatie; privégegevens horen niet in GitHub.

Lees [UPDATE-3.2.0.md](UPDATE-3.2.0.md) voor de reparaties en [CONTROLES.md](CONTROLES.md) voor uitgevoerde checks. De documentatiecorrectie verandert de codeversie niet. Live Discordrechten en streambereikbaarheid moeten op je hosting worden gecontroleerd.
