# Radiofix 3.1.8

Stop de bot, vervang de bestanden en herstart. Bewaar `.env` en de database. Vanaf 3.1.7 zijn geen extra dependencies nodig.

Radio Veronica-homepagelinks worden automatisch naar de directe audiostream omgezet. Voor een nieuwe dropdownkeuze: `/radio instellen zender:12 naam:Radio Veronica url:https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICA.mp3`, daarna `/radio paneel`. Kies een ander zendernummer als 12 al bezet is.

Ook opgelost: FFmpeg-protocolblokkade bij HTTP-proxyverbindingen. Consolemeldingen tonen nu de zender en de eigenlijke FFmpeg-fout zonder stream-URL's.

Dit volledige pakket bevat de eerdere radiofunctie, dropdown, volumeknoppen en `/leave`.
