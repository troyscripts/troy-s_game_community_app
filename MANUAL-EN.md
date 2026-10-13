# Troy’s Game Community Bot — User Manual

### Server language
The owner and existing authorized configuration managers can choose:

- `/config instellen instelling:Bot.Language waarde:nl` — Dutch public bot messages.
- Use `en` for English or `both` for Dutch and English. The default remains `both`.
- `/config instellen instelling:Logging.Language waarde:nl` — Dutch Discord logs (new default).
- Set logs to `en` or `both` to enable translated logs. This includes ticket logs and startup reports.

Settings persist per server and apply immediately to new messages. Existing messages stay unchanged. `/config herstellen` restores the relevant default. Personal `/language` choices still control private replies. Without a personal choice, English servers use English; others use Dutch. Console and file logs remain Dutch. Custom text uses the existing opt-in translation features; transcript files preserve original conversations. Command option names follow your Discord interface language.


Users and roles are mentioned once per message. Repeated references show a plain name (or ID if unavailable). Repeated `@everyone` and `@here` references are also made non-pinging.

**Bot version 3.0.0 · Updated 13 October 2026**

## New in 2.9.9-beta: Dutch and English

- Public bot messages follow `Bot.Language`, defaulting to Dutch followed by English. In `both` mode, short buttons and selection labels show both languages side by side.
- Use `/language taal:English` or `/language taal:Nederlands` for your private replies. The preference is saved per member and server and survives restarts. Without a personal choice, English servers use English; other servers use Dutch.
- Slash commands, subcommands and options have English display names and descriptions when your Discord interface is English. This manual retains the original command identifiers in examples. `/language` changes private replies, not your Discord interface language.
- `/help` uses your saved language for its attachment unless you select a different `taal` option. Its public message and support link follow `Bot.Language`.
- Custom giveaway prizes and self-role panels are not automatically rewritten. Poll content, welcome translations and the optional `/say` translation described below are explicit exceptions.

### Translate poll questions and answers

`/poll maken` automatically translates the question and answers into English using the existing Groq connection. Both languages share the same answer numbers, votes and timer. Translations are stored, so voting and restarting do not request another translation.

To provide or correct the translation yourself, supply both `vraag-en` and `antwoorden-en`. Separate English answers with `|`, preserving their number and order. This also works without Groq. The English question allows 700 characters; each English answer allows 120.

`/poll wijzigen` translates changed content again. Changing the question, answer list or manual English translation clears the votes. A timer-only change preserves votes. If translation fails, no new poll is posted and an existing poll remains unchanged. Existing polls receive a translation when next edited; legacy reaction polls are not included.

### Translate a /say message

Use `/say bericht:Welkom allemaal! embed:False vertalen:True` to prepare an English translation; the posted message follows `Bot.Language`. In an English Discord interface, use `/say message:Welkom allemaal! embed:False translate:True`. Both plain messages and embeds support translation, including the optional target channel. You can supply `engels` (English display name: `english`) instead to enter the English text yourself. Without these options, your message is posted unchanged.

Permissions are checked before translating. If translation fails, the message is not posted. Long translated messages may include the full text as an attachment; the bot needs **Attach Files** permission for this.

### Translate your configured welcome text

1. Save your Dutch text using `/welkomstbericht instellen` or `Welcome.Message` in `/config`.
2. Run `/welkomstbericht vertalen` (shown as `/welcome translate` in English Discord). The bot translates the saved text once and stores it.
3. New members receive the selected server language (`both`: Dutch followed by English). Names, member counts, links and mentions are preserved.
4. Use `/welkomstbericht vertalen engels:...` to provide or correct the translation manually. Keep all placeholders, links and mentions. `/welkomstbericht voorbeeld` previews it in your preferred language.

After editing the Dutch welcome text, run `vertalen` again. Until then, the new Dutch text is used; a stale English translation is never paired with a different source. The built-in default welcome supports both languages and follows `Bot.Language`.

**Automatic translation:** configure `GROQ_API_KEY` only in `.env`; `GROQ_MODEL` remains optional. Translation does not require `AIChat.Enabled`. Only the provided poll text or welcome template is sent to Groq, never channel history. If access is missing or the provider is unavailable or rate-limited, enter the English text manually. Review machine translations and correct them when necessary.

Very long messages are fitted to Discord's limits. If text must be shortened, its full version is attached as `complete-message.txt` to the same message.

Each server manages its own settings through `/config` in Discord. Fixed configuration mode has been removed.

This manual explains how to use the bot in Discord: birthdays, levels, virtual money, entertainment, polls, giveaways, staff commands and server settings.

**Setting keys and placeholders remain unchanged.** Command names in examples use their original identifiers; English Discord shows their localized names. Dates use day-month-year. Configuration accepts `yes`/`no`, `on`/`off` and `empty`/`none` as well as the Dutch forms.

## Changes introduced in version 2.5.0

- Missing welcome text has a built-in fallback. Join messages read the correct server’s saved text.
- Change welcome text with `/welkomstbericht instellen`.
- Use `/welkomstbericht voorbeeld` to see placeholders and preview your current message.
- Placeholders cover the new member, server name, current member count and Discord IDs.
- Welcome text is saved per server and survives restarts.
- Since 2.4.9, `/ping` also shows connection status, average/minimum/maximum Gateway ping, uptime and connection events. Revision 2.4.9A improved status-report stability.

## /help — Manual and support

Use `/help` to receive the manual in your saved `/language` preference, or choose **English** explicitly to receive this manual. In a Dutch Discord interface: `/help taal:English`. In an English interface the option is displayed as `language`.

The manual is sent as a downloadable attachment in the channel where you run the command. Everyone with access to that channel can see it. Anyone can use `/help`, with a 10-second cooldown per user. The public response and support line follow `Bot.Language`. The attachment follows your saved preference, or English on an English server and Dutch otherwise.

For support, go to https://discord.gg/nTzVy5uMWX

The bot needs permission to send messages and attach files in that channel.

## Bump reminders

Set a separate reminder channel for each Discord server:

```text
/config instellen instelling:Bump.Channel waarde:#bump
```

Enter a real channel mention or channel ID as `waarde`. The usual `/config` owner/developer permissions apply. The setting is available in autocomplete and `/config bekijken`.

The first reminder is sent immediately when enabled. After that, reminders are sent every two hours after the previous successful delivery. They ask members to use `/bump`; they do not ping members or roles. The bot does not perform a bump and does not detect completed bumps: this is a fixed reminder schedule.

The scheduler checks every 30 seconds. Channel changes through `/config` are processed immediately: the newly selected channel receives a reminder, followed by another two hours later. The schedule is stored in the database and survives restarts. After downtime, at most one overdue reminder is sent.

**Disable:** `/config instellen instelling:Bump.Channel waarde:uit` or `/config herstellen instelling:Bump.Channel`. No further reminders are sent after the setting is processed; existing messages remain.

The bot must be able to view the channel and send messages. Threads also require permission to send messages in threads. If the channel is unavailable or permissions are missing, the bot logs a warning and retries later.

## Getting started

Type `/` in a Discord channel and select a bot command. Discord shows its fields. **Required** fields must be filled in; **optional** fields can be omitted.

| Goal | How |
| --- | --- |
| Receive the manual | `/help`, choosing English if wanted |
| Set your birthday | `/setbirthday datum:15-09-1991` — use your own birth date |
| Check level and XP | `/rank` |
| Check your balance | `/balance` |
| Earn virtual money | `/daily` or `/work` |
| Choose a role | Click a self-role button; click again to remove the role |
| Ask for help | Use the ticket panel in the designated channel |
| Change welcome text (management) | `/welkomstbericht instellen`; first use `/welkomstbericht voorbeeld` for guidance |
| Talk to AI | Send a message in an enabled AI channel |

All money in this manual is **virtual game money**. Features and permissions can differ by server. Ask a server administrator if a command is missing or access is denied.

## Permissions

Member commands are available to everyone where the server allows them. Management commands require the access listed for each command.

**Owner access** means the server owner, bot owner or a member with the configured Owner or Developer role. Administrator grants access to many staff features and self-role management, but does not automatically grant `/config` access. `/give` and `/economy-reset` have their own restrictions below.

Discord role hierarchy and channel access still apply. Management access does not allow every role or user to be managed.

## Member commands — Birthdays

Everyone may use the commands in this section, subject to cooldowns and server settings.

### /setbirthday

Save your birthday. Required: `datum`, in **DD-MM-YYYY** format, for example `15-09-1991`.

### /birthday

View a birthday. Optional: `gebruiker`, the user whose birthday you want to see.

### /birthdays

View community birthdays. No options.

### /removebirthday

Remove your saved birthday. No options.

## Member commands — Levels and XP

Everyone may use these commands, subject to cooldowns and server settings.

### /rank

View your level and XP. Optional: `gebruiker` to view another member.

### /level

View a user’s level. Required: `gebruiker`.

### /leaderboard

View the level leaderboard. No options.

## Member commands — Virtual money

Everyone may use these commands, subject to cooldowns and server settings.

### /store

Buy temporary VIP using **virtual game money**. The store and purchase confirmation are private.

| Package | Price | Saving compared with separate days |
| --- | --- | --- |
| VIP 1 day | €500 | — |
| VIP 3 days | €1,300 | €200 |
| VIP 7 days | €2,700 | €800 |

| Command | Action |
| --- | --- |
| `/store` | Open the shop; pay from your wallet by default |
| `/store betaalmiddel:Bank` | Pay from your bank account; wallet and bank funds are not automatically combined |
| `/store actie:status` | Show active purchased VIP, expiry and any purchase awaiting delivery |
| `/store actie:geschiedenis` | Show the last ten orders: delivered, pending or refunded |

Choose a package, then click **Kopen / verlengen** (buy / extend). Cancelling before purchase costs nothing. Each day is exactly 24 hours. New VIP starts when the role is successfully delivered; extensions add to the current expiry. There is no automatic renewal or recurring payment.

**Setup:** create a separate VIP role and run `/config instellen instelling:Store.VIPRole waarde:@VIP` using a real role mention or ID. The bot needs Manage Roles and its highest role must be above VIP. Staff/administrative roles, @everyone, managed roles, the birthday role and automatic join role cannot be sold. `Economy.Enabled` must be enabled for purchases. `/config herstellen instelling:Store.VIPRole` closes the shop to new purchases; existing purchases continue and still expire normally.

**Rewards:** purchased VIP uses the existing 2× bonus for normal chat XP, counting XP, catch-up XP, `/daily` and `/work`, while reward bonuses are enabled. It does not stack with birthdays or another VIP role: the maximum is 2×. The store role does not need to be added to `VIP_ROLE_IDS`. Transfers, manual money/XP adjustments, starting balances, deposits and withdrawals do not receive a bonus. The bonus ends at the stored expiry even if Discord role removal is delayed.

**Expiry:** checked every 30 seconds and immediately after startup. Normally the role is removed by the next check; during downtime or permission failures it is removed once the bot can perform the action again. A missing role for an active purchase is restored, for example when a member rejoins. The timer continues while they are away. Do not use the store role for separate manual VIP grants.

**Payment handling:** balance deduction and the order are saved in one database transaction. Reusing the same purchase confirmation cannot charge twice. Insufficient funds cause no charge. Temporary Discord/network errors leave the paid order pending for automatic delivery retry. Confirmed non-delivery, such as a missing role, missing permissions or a departed buyer, refunds the amount once to the original wallet/bank source. Check status and history if anything goes wrong. Only one pending order per member is allowed at a time.

**Existing VIP:** if a member already holds the role without a shop entitlement, purchases are refused; that role is not taken over or automatically removed. Changing the configured store role does not change existing purchases: the original role and expiry are retained. Members must wait for old VIP to expire before purchasing the newly configured role.

Orders are stored per server and survive restarts. Resetting XP/money using `/reset-voortgang` does not end previously purchased VIP. Successful receipts show the package, amount, payment source and expiry.

### /balance

View your balance. Optional: `gebruiker` to view someone else’s balance.

### /daily

Claim your daily reward. No options.

### /work

Work to earn virtual money. No options.

### /deposit

Deposit money into your bank account. Required: `bedrag`, amount, minimum 1.

### /withdraw

Withdraw money from your bank account. Required: `bedrag`, amount, minimum 1.

### /pay

Send money to another user. Required: `gebruiker` (recipient) and `bedrag` (amount, minimum 1).

### /rekening

Send and manage virtual-money bills.

| Command | Options |
| --- | --- |
| `/rekening sturen` | Required: `gebruiker` (recipient), `bedrag` (1–1,000,000), `omschrijving` (description, 1–200 characters) |
| `/rekening overzicht` | Optional: `richting` (`received` or `sent`), `pagina` (1–100,000; 10 bills per page) |
| `/rekening bekijken` | Required: `nummer`, bill number from your overview, minimum 1 |
| `/rekening betalen` | Required: `nummer`, minimum 1. Optional: `van`, either `bank` (default) or `wallet` |
| `/rekening weigeren` | Required: `nummer`, minimum 1; refuse a bill |
| `/rekening annuleren` | Required: `nummer`, minimum 1; cancel a bill |

### /stelen

Try to steal virtual money from another user’s wallet. An unsuccessful attempt costs €100. Required: `gebruiker`, the target user.

### /economy-leaderboard

View the richest users. No options.

## Member commands — Entertainment and information

Everyone may use these member commands, subject to cooldowns and server settings. Giveaway management and poll management have additional restrictions described below.

### /8ball

Ask the magic 8-ball a question. Required: `vraag`, your question.

### /avatar

View an avatar. Optional: `gebruiker`, whose avatar to display.

### /banner

View a Discord profile banner. Optional: `gebruiker`.

### /coinflip

Flip a coin. No options.

### /dice

Roll a die. Optional: `zijden`, number of sides, from 2 to 100.

### /meme

View a random meme. No options.

### /ping

View bot latency and connection health. No options.

- **Bot latency:** measured time between your command and the bot’s reply.
- **Discord Gateway:** current ping to Discord.
- **Status:** Normaal (normal), Verhoogd (elevated), Hoog (high), Kritiek (critical) or Onbekend (unknown). Different thresholds for rising and falling status reduce rapid changes caused by small fluctuations.
- **Average, minimum and maximum:** Gateway measurements from the current bot session, keeping up to 24 hours of history.
- **Uptime and measurements:** how long the bot has been running and the number of samples.
- **Gateway events:** disconnect, reconnect and timeout counts in this session.

One high reading or a reconnect does not prove the bot has frozen. If problems persist, collect several readings and show them to an administrator.

### /giveaway

Staff can create a giveaway in the channel where the command is used. Members click **Deelnemen / uitschrijven** (join / withdraw) to enter or withdraw. Each person has one entry; bots cannot enter.

| Command | Action |
| --- | --- |
| `/giveaway start` | Fill in `titel` (title), `tekst` (description), `einddatum` (end date) and `prijzen` (prizes) |
| `/giveaway stoppen id:12` | End giveaway 12 early and immediately draw winners |
| `/giveaway annuleren id:12` | Cancel an open giveaway without a draw, clear participants and delete its message |

Example:

```text
/giveaway start titel:Community giveaway tekst:Enter for a chance to win! einddatum:18-10-2026 20:00 prijzen:€10 Steam gift card | Discord Nitro
```

Use a future date in **DD-MM-YYYY HH:MM**, always in **Europe/Amsterdam**, including daylight saving time. The maximum is two calendar months from creation. Invalid dates or ambiguous times during clock changes are rejected; choose a different time.

Enter 1–10 prizes separated by `|`, up to 80 characters each. **Each prize gets one unique winner.** For three identical gift cards, enter `€10 gift card | €10 gift card | €10 gift card`. The first drawn winner gets the first prize, and so on. One entrant can win at most one prize in a giveaway.

At closing, the bot randomly selects from registered entrants using Node crypto. Results are saved before being announced in a separate message in the same channel, with a mention for each winner. Other mentions in the title, description or prize names do not ping anyone. Prizes are not delivered automatically; the organizer handles delivery.

If there are fewer entrants than prizes, each available entrant can win one prize and the remaining prizes are not awarded. With no entrants, the result reports no winner. Entrants who later leave the server are not automatically removed from the draw.

**Management access:** configured staff roles, Administrator, server owner and users with Owner/Developer access under the bot’s existing rules. Members can only enter or withdraw. The Giveaway-ID appears below the message. Closed giveaways cannot be redrawn or cancelled using these commands.

**Automatic closing:** checked every 10 seconds. Entries are refused after the deadline. Overdue giveaways are processed after a restart. Entry is unavailable while the bot is offline. Entrants, deadline and draw are stored in SQLite. Failed announcements are retried with the same saved results.

**Bot permissions:** View Channel, Send Messages, Embed Links and Read Message History. Threads also require Send Messages in Threads. Cancellation deletes only the bot’s own giveaway message. If deletion temporarily fails, the giveaway remains cancelled and deletion is retried.

### /poll

Create a poll with 2–10 answers and a timer. Vote using the numbered buttons below its message.

| Command | Access | Action |
| --- | --- | --- |
| `/poll maken` | Everyone | Supply `vraag` (question), `antwoorden` (answers separated by `\|`) and `minuten` (minutes). Set `meerdere:True` to allow multiple choices |
| `/poll wijzigen` | Staff | Supply `id` and a new `vraag`, `antwoorden` or `minuten` |
| `/poll stoppen` | Staff | Supply `id`; close immediately and keep results |
| `/poll annuleren` | Staff | Supply `id`; invalidate the poll and clear votes, including for an already closed poll. Its message remains marked as cancelled |

Example:

```text
/poll maken vraag:What are we playing tonight? antwoorden:FiveM | ETS2 | ATS minuten:60 meerdere:False
```

The Poll-ID appears below the message. `/poll wijzigen id:12 minuten:30` gives poll 12 another 30 minutes from now. Changing only its timer keeps votes. Changing the question or answer list clears votes and requires everyone to vote again; the message explains this. Closed or cancelled polls cannot be reopened or edited.

**Voting:** one answer per person by default. Click another answer to switch, or the same answer again to withdraw your vote. With multiple choices, each answer toggles independently. Totals are public; individual confirmations are private. Each selected answer counts as one vote, so total votes can exceed participant count when multiple choices are enabled.

**Timer:** 1–43,200 minutes (30 days), with a visible deadline. Votes after the deadline are refused immediately. The bot checks every 10 seconds whether messages need closing. Polls and votes are stored in SQLite; overdue polls close after a restart. Voting buttons do not work while the bot is offline.

**Staff:** configured staff roles, Administrator, server owner and users with Owner/Developer access under existing bot rules. Ordinary members can create and vote in polls, but cannot manage even their own polls without staff access.

**Bot permissions:** View Channel, Send Messages, Embed Links and Read Message History; also Send Messages in Threads when applicable. If a message update temporarily fails, the bot saves the change and retries.

Old Yes/No reaction polls are not converted and cannot be managed with these commands. Create a new poll instead.

### /ship

View a fun love match between two users. Required: `persoon1` and `persoon2`.

## Staff commands — Moderation

Discord hierarchy and bot permissions still apply to all moderation actions.

### /ban

Ban a user. Access: Owner or Ban Members permission. Required: `gebruiker` and `reden` (reason). Optional: `dagen`, number of days of messages to delete, 0–7.

### /unban

Remove a ban. Access: Owner or Ban Members permission. Required: `userid`, the user’s Discord ID.

### /kick

Remove a user from the server. Access: Owner or Kick Members permission. Required: `gebruiker` and `reden`.

### /timeout

Timeout a user. Access: Owner or Moderate Members permission. Required: `gebruiker`, `duur` (duration in minutes, 1–40,320) and `reden`.

### /untimeout

Remove a timeout. Access: Owner or Moderate Members permission. Required: `gebruiker`.

### /warn

Warn a user. Access: Owner or Manage Messages permission. Required: `gebruiker` and `reden`.

### /warnings

View a user’s warnings. Access: Owner or Manage Messages permission. Required: `gebruiker`.

### /clear

Delete channel messages. Access: Owner or Manage Messages permission. Required: `aantal`, number of messages, 1–100.

### /purge

Delete messages. Access: Owner or Manage Messages permission. Required: `aantal`, 1–100.

## Staff commands — Levels, money and messages

### /setxp

Set a user’s XP. Access: Owner or Manage Server permission. Required: `gebruiker` and `xp`, minimum 0.

### /resetxp

Reset a user’s XP. Access: Owner or Manage Server permission. Required: `gebruiker`.

### /give

Give virtual money to a user. Required: `gebruiker` and `bedrag`, minimum 1.

Access: bot owner or a configured Owner, Head Admin or Admin role. A Developer role, server ownership or Administrator alone is not sufficient for this command.

### /economy-reset

Reset a user’s economy. Required: `gebruiker`.

Access: bot owner or a configured Owner, Head Admin or Admin role. A Developer role, server ownership or Administrator alone is not sufficient for this command.

### /say

Make the bot send a message. Normally requires Manage Messages. You must be able to view and send messages in the target channel, and the bot needs access too.

Required: `bericht` (message, 1–2,000 characters) and `embed` (whether to send an embed). Optional: `kanaal`, the destination channel.

## Staff commands — Tickets

The commands in this section require Owner access or Manage Channels permission.

### /ticket-panel

Post a ticket panel with up to 10 custom categories. All options are optional.

| Topic | Options |
| --- | --- |
| 1 | `categorie1`, `minimumrol1` |
| 2 | `categorie2`, `minimumrol2` |
| 3 | `categorie3`, `minimumrol3` |
| 4 | `categorie4`, `minimumrol4` |
| 5 | `categorie5`, `minimumrol5` |
| 6 | `categorie6`, `minimumrol6` |
| 7 | `categorie7`, `minimumrol7` |
| 8 | `categorie8`, `minimumrol8` |
| 9 | `categorie9`, `minimumrol9` |
| 10 | `categorie10`, `minimumrol10` |

Each `categorie` is a topic name, such as Support or Report a bug, with 1–50 characters. Its matching `minimumrol` is the lowest staff rank allowed for that topic; leaving it blank allows all configured staff roles. After the command, select the Discord destination categories in the setup screen. A minimum role requires a topic name.

### /ticket-add

Add a user to the current ticket. Required: `gebruiker`.

### /ticket-remove

Remove a user from the current ticket. Required: `gebruiker`.

### /ticket-claim

Claim a ticket. No options.

### /ticket-info

View information about the current ticket. No options.

### /ticket-close

Close the current ticket and send a transcript to its owner. No options.

## Administrator commands

### /bot-avatar

Manage the bot’s profile picture for this server. Access: Owner/configured Developer role.

| Command | Options |
| --- | --- |
| `/bot-avatar instellen` | Required: `afbeelding`, a PNG, JPG or GIF up to 2 MB |
| `/bot-avatar bekijken` | None; view current avatar |
| `/bot-avatar herstellen` | None; restore avatar |

### /welkomstbericht

Change the welcome message shown when members join. Requires Owner access or the configured Developer role. Confirmation and preview are visible only to the command user.

| Command | Options |
| --- | --- |
| `/welkomstbericht voorbeeld` | None; show placeholders and a preview using your account and the current member count |
| `/welkomstbericht instellen` | Required: `tekst`, the new message, up to 4,000 characters |

1. Use `/welkomstbericht voorbeeld` to view placeholders.
2. Run `/welkomstbericht instellen` and enter your full message in `tekst`.
3. Check the private preview. Saved text applies immediately to new members and survives restarts.

| Placeholder | Replacement | Example |
| --- | --- | --- |
| `{gebruiker}` | Mention of the new member | @Troy |
| `{gebruikersnaam}` | Member’s Discord username | troy |
| `{server}` | This Discord server’s name | Troy’s Game Community |
| `{ledenaantal}` | Current total member count, including bots and the new member | 250 |
| `{gebruikersid}` | New member’s Discord ID | Member ID |
| `{serverid}` | Server’s Discord ID | Server ID |

Copy into `tekst`:

```text
👋 Welcome {gebruiker} to **{server}**!\n\nYou are member **{ledenaantal}**. 🎉\nRead the rules and verify yourself. Have fun!
```

`\n` becomes a new line when saved; `\n\n` inserts a blank line. Markdown such as `**bold text**` is supported. Keep placeholder names exactly as shown; unknown placeholders remain literal text.

The message appears in an embed titled **Lid toegetreden** (member joined). Only the description changes. Long private previews are shortened without truncating the saved template. The final rendered message is limited to 4,000 characters, including substituted values.

`Welcome.Enabled` must be on and `Welcome.Channel` must be an accessible text channel. The bot needs Send Messages and Embed Links. This command changes only the text; it does not set a channel or enable welcome messages. A separate join log may also be sent through existing logging settings.

### /reset-voortgang

Access: the same Owner/Developer access as `/config`.

Use `/reset-voortgang bevestigen:Ja` to permanently reset everyone’s progress in the current server. Choosing `Nee` makes no changes.

- XP becomes level 1, 0 XP, 0 messages, with the XP cooldown reset.
- Existing economy profiles receive €0 wallet and €0 bank. Daily, work, theft and billing cooldowns are cleared.
- Pending bills are cancelled. Completed bills and theft history remain.
- Existing profiles remain, preventing them from receiving starting money again. New users still receive configured starting money.
- Leaderboards show reset values. New activity earns fresh XP and money.
- Discord roles, settings, counting, tickets, birthdays and other servers are unchanged.

There is no undo command. Back up the database first if you need the option to restore it.

### /config

View or change settings for this Discord server. Access: Owner/configured Developer role.

| Command | Options |
| --- | --- |
| `/config bekijken` | Optional: `onderdeel`, a section such as Tickets |
| `/config instellen` | Required: `instelling`, a setting such as Counting.Channel. Optional: `waarde`, its value; omit only for StaffRoles to open a role picker |
| `/config herstellen` | Required: `instelling`, reset this setting |
| `/config exporteren` | None; export settings |
| `/config resetten` | Required: `bevestigen`; choose Ja to reset all server settings |
| `/config hulp` | None; show guidance |

### /agenda

Manage and display the YouTube schedule. Access: Owner/configured Developer role.

| Command | Options |
| --- | --- |
| `/agenda toevoegen` | Required: `titel` (1–100 characters), `datum` (DD-MM-YYYY, 10 characters), `tijd` (HH:MM, 5 characters). Optional: `beschrijving` (1–500 characters) |
| `/agenda verwijderen` | Required: `id`, schedule item number, minimum 1 |
| `/agenda tonen` | Optional: `kanaal`; defaults to the current channel |
| `/agenda lijst` | None; list items |

### /selfrollen

Manage multiple self-role panels per server. Members click a button to get a role; clicking again removes it.

Management requires Owner access, the configured Developer role or Discord Administrator. Ordinary staff access alone is insufficient.

| Command | Options |
| --- | --- |
| `/selfrollen maken` | Required: `naam`, unique name up to 32 characters using lowercase letters, digits, `_` and `-`. Opens the title/text form |
| `/selfrollen tekst` | Required: `paneel`; select an existing panel and edit its text |
| `/selfrollen knop` | Required: `paneel`, `rol`, `label` (up to 80 characters). Optional: `kleur` (Blauw/blue, Grijs/grey, Groen/green, Rood/red), `emoji` (one emoji or `<:name:id>`; `geen` clears it) |
| `/selfrollen knop-verwijderen` | Required: `paneel`, `rol` |
| `/selfrollen plaatsen` | Required: `paneel`, `kanaal` (text or announcement channel). Optional: `bericht-id` to replace an existing self-role message from this bot in that channel |
| `/selfrollen voorbeeld` | Required: `paneel`; private preview listing buttons as text |
| `/selfrollen verversen` | Required: `paneel`; refresh all registered panel messages |
| `/selfrollen verwijderen` | Required: `paneel`, `bevestigen`; choose Ja to delete the panel and disable its buttons |
| `/selfrollen lijst` | None; list panels, button counts and posted messages |
| `/selfrollen hulp` | None; show setup steps |

Create a panel, enter its title and description, add buttons and post it in a channel. The title allows 256 characters, the description 4,000, and Markdown is supported. Each panel supports up to 25 buttons. Setting the same role again updates its existing button.

One panel can be posted multiple times. Text/button changes update all registered copies. Use `verversen` if a message was temporarily unreachable. Removing a button or panel does not remove roles already assigned to members.

To replace an old default panel, use `plaatsen` with its `bericht-id`. Only this bot’s existing self-role messages can be replaced. Unreplaced default panels continue using `SelfRoles.fivem`, `SelfRoles.ats`, `SelfRoles.minecraft` and `SelfRoles.streams`.

The bot needs Manage Roles and a highest role above the role it grants. Managed roles, @everyone, configured staff roles and roles with administrative permissions are rejected. Except for the actual server owner, the manager must also be above the selected role. Checks run again when role buttons are clicked.

Panel changes and role additions/removals are logged. With `Logging.Enabled` on, these appear in `Logging.Channel`. Manage panels using `/selfrollen`.

## Server settings through Discord

This section is for managers with Owner access. Use `/config bekijken` to see current settings. Changes apply only to the server where you use the command.

With `/config instellen`, select an **instelling** (setting) and enter its **waarde** (value):

```text
/config instellen instelling:Birthday.CheckTime waarde:00:00
/config instellen instelling:Tickets.MaxOpenPerUser waarde:5
/config instellen instelling:StaffRoles
```

For `StaffRoles`, omit the value to select roles interactively. The defaults below apply to a new server; existing saved settings can differ. Each server, including Troy’s Game Community, uses its saved `/config` settings. `config/defaults.js` supplies baseline values.

Boolean values accept `ja`/`nee`, `yes`/`no`, `on`/`off` or `true`/`false`. Keep setting keys and special values exactly as shown. Empty defaults below mean no ID is configured. Dutch message templates in the defaults column are literal defaults, not untranslated instructions.

| Setting | Type | Default | Meaning |
| --- | --- | --- | --- |
| `Prefix` | Text | `!` | Prefix excluding ordinary messages from processing. Commands themselves use slash commands |
| `Bot.Name` | Text | `Troy's Gamecommunity` | Name in bot messages. `{server}` uses the actual server name. Does not rename the bot account |
| `Bot.Color` | Text | `#c9a91b` | Embed color |
| `Bot.Footer` | Text | `Troy's Gamecommunity Discord` | Embed footer |
| `Roles.Developer` | Role ID | Empty | Developer role with owner access on this server, including `/config` |
| `Roles.Owner` | Role ID | Empty | Owner role with owner access on this server, including `/config` |
| `Roles.HeadAdmin` | Role ID | Empty | Head Admin role, including access to give and economy-reset |
| `Roles.Admin` | Role ID | Empty | Admin role, including access to give and economy-reset |
| `Roles.HeadModerator` | Role ID | Empty | Head Moderator role; also add it to StaffRoles for staff access |
| `Roles.Moderator` | Role ID | Empty | Moderator role; also add it to StaffRoles for staff access |
| `Roles.Verified` | Role ID | Empty | Role assigned by the verification button |
| `Roles.NewUser` | Role ID | Empty | Role removed after verification |
| `StaffRoles` | List | `[]` | Regular staff roles. Omit `waarde` when configuring to select up to 25 roles |
| `SelfRoles.fivem` | Role ID | Empty | FiveM button role on an old default panel; use `/selfrollen` for new panels |
| `SelfRoles.ats` | Role ID | Empty | ATS button role on an old default panel |
| `SelfRoles.minecraft` | Role ID | Empty | Minecraft button role on an old default panel |
| `SelfRoles.streams` | Role ID | Empty | Streams button role on an old default panel |
| `Store.VIPRole` | Role ID | Empty | Dedicated temporary VIP role sold through /store and removed when purchased time expires |
| `Bump.Channel` | Channel ID | Empty | Channel for an immediate bump reminder when enabled, then every two hours; `uit` disables it |
| `Logging.Enabled` | Boolean | `ja` | Enable activity, update and self-role messages in Discord. Deleted-message logging has its own switch |
| `Logging.MessageDelete` | Boolean | `ja` | Log deleted user messages in the configured Discord log channel |
| `Logging.Channel` | Channel ID | Empty | Logs for messages, commands, members, self-roles and bot updates |
| `Tickets.Enabled` | Boolean | `nee` | Allow new tickets through ticket-open buttons |
| `Tickets.Transcript` | Boolean | `ja` | This switch currently does not prevent transcripts from being sent |
| `Tickets.AutoClose` | Boolean | `nee` | Automatic closing is currently inactive; close tickets manually |
| `Tickets.Category` | Category ID | Empty | General fallback for old panels without their own destination |
| `Tickets.LogChannel` | Channel ID | Empty | Ticket logs and transcript copies, if accessible |
| `Tickets.MaxOpenPerUser` | Number | `5` | Maximum simultaneous open tickets per user per server. Existing saved values take precedence |
| `Levels.Enabled` | Boolean | `ja` | Automatic XP awards, including counting. Existing level commands remain available |
| `Levels.XPMin` | Number | `5` | Minimum random XP award per normal message |
| `Levels.XPMax` | Number | `14` | Maximum random XP award per normal message |
| `Levels.Cooldown` | Number | `60` | Seconds between normal XP awards for the same user |
| `Levels.AnnounceLevelUp` | Boolean | `ja` | Announce level increases in the message channel |
| `Levels.Roles.0` | Role ID | Empty | Role from level 0; highest configured reached threshold wins. Old level roles are not removed here |
| `Levels.Roles.3` | Role ID | Empty | Role from level 3; highest configured reached threshold wins. Old level roles are not removed here |
| `Levels.Roles.10` | Role ID | Empty | Role from level 10; highest configured reached threshold wins. Old level roles are not removed here |
| `Levels.Roles.20` | Role ID | Empty | Role from level 20; highest configured reached threshold wins. Old level roles are not removed here |
| `Levels.Roles.30` | Role ID | Empty | Role from level 30; highest configured reached threshold wins. Old level roles are not removed here |
| `Economy.Enabled` | Boolean | `ja` | Enables/disables stealing and bills; does not disable every money command |
| `Economy.StartingMoney` | Number | `500` | Starting wallet balance when an economy profile is created |
| `Economy.DailyCooldownHours` | Number | `24` | Daily cooldown in hours; 0 still uses 24 hours |
| `Economy.WorkCooldownMinutes` | Number | `60` | Work cooldown in minutes; 0 still uses 60 minutes |
| `Counting.Enabled` | Boolean | `ja` | Enable counting in the selected channel |
| `Counting.Channel` | Channel ID | Empty | Channel where players take turns posting consecutive numbers |
| `Counting.RewardXP` | Number | `10` | XP for a correct number; requires Levels.Enabled |
| `Counting.FeedbackDeleteSeconds` | Number | `30` | Seconds before a counting error message is deleted; 0 keeps it |
| `AIChat.Enabled` | Boolean | `nee` | Enable AI replies |
| `AIChat.Channels` | List | `[]` | Channel IDs where AI may reply. Empty means nowhere. Threads require their own ID |
| `AIChat.Mode` | Text | `all` | `all`: reply to ordinary text; `mention`: require an explicit bot mention |
| `AIChat.CooldownSeconds` | Number | `10` | Cooldown per user per channel after a successful reply, 1–300 seconds |
| `AIChat.HistoryTurns` | Number | `4` | Previous conversation turns retained, 0–8; 0 disables conversation history |
| `AIChat.Personality` | Text | `Je houdt van gaming en een gezellige community. Gebruik af en toe een emoji.` | Tone/community context, up to 2,000 characters; default asks for a friendly gaming tone and occasional emoji |
| `Birthday.Enabled` | Boolean | `ja` | Daily birthday processing; commands remain available |
| `Birthday.CheckTime` | Text | `00:00` | Daily birthday processing time, HH:MM |
| `Birthday.Timezone` | Text | `Europe/Amsterdam` | Birthday processing timezone |
| `Birthday.Role` | Role ID | Empty | Temporary birthday-calendar-day role; previous birthday roles are removed on the next check. Also grants 2× rewards |
| `Birthday.Channel` | Channel ID | Empty | Birthday greeting channel |
| `Birthday.Messages` | List | Three greeting templates below | `{user}` becomes a mention of the birthday member |
| `Agenda.Timezone` | Text | `Europe/Amsterdam` | Timezone for schedule dates and times |
| `Agenda.Title` | Text | `📅 YouTube-planning` | Schedule title |
| `Agenda.YouTubeUrl` | Text | `https://www.youtube.com/@troys-game-community` | Full YouTube link; `leeg` or `geen` removes it |
| `Agenda.MaxVisibleItems` | Number | `80` | Maximum visible schedule items, further limited by embed capacity |
| `Welcome.Enabled` | Boolean | `ja` | Enable welcome messages |
| `Welcome.Channel` | Channel ID | Empty | Welcome message channel |
| `Welcome.Message` | Text | Built-in welcome text | Template using placeholders listed under `/welkomstbericht`; edit with `/welkomstbericht instellen` |
| `Welcome.AutoRole` | Role ID | Empty | Role granted on joining, independently of Welcome.Enabled |
| `Leave.Enabled` | Boolean | `ja` | Enable departure messages |
| `Leave.Channel` | Channel ID | Empty | Departure message channel |
| `StartupMessageScan.ProcessMissedXP` | Boolean | `ja` | Award missed XP during the startup scan |
| `StartupReport.Enabled` | Boolean | `ja` | Enable startup reports in Discord |
| `StartupReport.Channel` | Channel ID | Empty | Startup status and scan results channel |

The literal default birthday templates are:

```json
[
  "Van harte gefeliciteerd met je verjaardag, {user}! 🎉🎂",
  "Vandaag zetten we {user} in het zonnetje. Gefeliciteerd! 🥳",
  "Een hele fijne verjaardag gewenst, {user}! 🎈"
]
```

You can configure additional level roles, such as `Levels.Roles.15` for level 15. Role and channel fields accept mentions or IDs. Use `leeg` to clear a supported role, channel or list field. Separate list values with commas; for `Birthday.Messages`, separate greetings with `|`.

## Birthdays and double rewards

Use `/setbirthday` to save your birth date. The default birthday processing time is **00:00, Europe/Amsterdam**. Saved server times remain after updates. To change an existing server:

```text
/config instellen instelling:Birthday.CheckTime waarde:00:00
/config instellen instelling:Birthday.Timezone waarde:Europe/Amsterdam
```

The role applies for the **birthday calendar day until the next midnight**, rather than exactly 24 hours after assignment. Old roles are removed on the next check, even when a greeting has already been sent that day. If the bot is offline, this happens when it becomes available. `Birthday.Enabled` must be on, and the bot must be able to fetch members and manage the birthday role.

The configured birthday role and a designated bonus VIP role grant **2×** these new rewards. Having both still gives 2×, not 4×.

| Reward or action | Bonus |
| --- | --- |
| Normal chat XP | 2× |
| Correct counting XP | 2×; Levels.Enabled must be on |
| Missed XP during startup scan | 2× based on current roles; historical roles are unavailable |
| `/daily` | 2× money; base €500–€1,000, bonus €1,000–€2,000 |
| `/work` | 2× money; base €50–€500, bonus €100–€1,000 |
| `/give`, `/pay`, bills, stealing, deposits, withdrawals, starting balance | No bonus |
| Manual XP adjustments | No bonus |

Cooldowns stay the same. Existing XP and balances are not doubled retroactively. The role configured in `Store.VIPRole` qualifies automatically. Other roles merely named VIP do not automatically qualify; ask an administrator which roles are designated.

## Ticket panels and transcripts

After `/ticket-panel`, a setup screen lets you select Discord destination categories for ticket topics. `Tickets.Category` is the fallback. Minimum staff roles can be selected per topic, using configured `StaffRoles` and role order. A minimum role requires a topic name.

Tickets support a separate staff thread and use `Tickets.MaxOpenPerUser`, default 5. `/ticket-close` sends the owner a transcript. Ticket logs and transcript copies use `Tickets.LogChannel` if available. A transcript is a record of the ticket conversation. Automatic closing is currently inactive; close tickets manually.

## Bot update notices

After an update, the bot automatically posts release notes to the configured log channel. Set:

```text
/config instellen instelling:Logging.Enabled waarde:ja
/config instellen instelling:Logging.Channel waarde:#your-log-channel
```

Select your real log channel. The bot needs permission to send messages, embeds and attachments there. The same version’s update notice is not repeated on every restart. Failed delivery is retried later.

Use `/config bekijken` to check saved settings. All servers, including Troy’s Game Community, manage these through `/config`. Separately, the bot checks GitHub on startup and every six hours. A newer release is reported in the bot console with a download link.

## Using AI chat

AI runs through GroqCloud. The bot owner configures the API key on the hosting service; see `GROQ-INSTALLATIE.md` (Dutch installation guide). Your PC does not need to stay on. Selected AI messages and a limited conversation history are processed by Groq. When a usage limit is reached, the bot reports it and temporarily pauses AI requests.

Send an ordinary text message in an enabled AI channel. In `all` mode, the bot replies to ordinary messages; in `mention` mode, mention the bot explicitly. A cooldown may apply between replies.

Administrators select channels with `AIChat.Channels` and enable replies with `AIChat.Enabled`. Set the tone with `AIChat.Personality`. The bot does not provide AI replies in the counting channel.

If AI is unavailable, try again later or tell an administrator.

## Using tickets and roles as a member

**Open a ticket:** find the ticket panel, choose the appropriate topic and follow the instructions. The default maximum is five simultaneous tickets; your server may use another limit.

**Choose a role:** click the desired self-role button. The bot confirms the assigned role. Click the same button again to remove it. You can choose multiple available roles.

## Troubleshooting

| Situation | What to do |
| --- | --- |
| A command is missing or access is denied | Check that you selected the correct bot; ask an administrator about required roles |
| You cannot claim another reward yet | Wait for the displayed cooldown |
| A role button fails | Try the current panel or show the message to an administrator |
| You cannot open a ticket | Check your open ticket count; ask staff if it still fails |
| A birthday role remains assigned | Ask an administrator to check birthday settings and role permissions |
| No welcome message appears | Check Welcome.Enabled, Welcome.Channel and bot permissions; preview with `/welkomstbericht voorbeeld` |
| The bot does not respond | Check that it is online and report the problem to staff |
| The manual is missing | Ask the bot administrator to place HANDLEIDING.md and MANUAL-EN.md in the bot’s main folder |

When reporting a problem, include the command or button used and the error message or a screenshot.

## Creator notifications

Use `/notify` to select a Discord channel per YouTube, TikTok or Twitch creator. New videos or active Twitch livestreams are announced automatically. Multiple creators are supported. Adding, removing, changing, viewing and testing creators requires Head Admin, Owner or Developer access under the bot’s notification permissions.

Use `/notify lijst`, `/notify toevoegen`, `/notify verwijderen` and `/notify test`. TikTok requires the creator’s authorization first. Twitch requires `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in the bot’s `.env`; never enter your stream key. Twitch is checked every five minutes and an active stream is announced once when first detected.

See [NOTIFY-HANDLEIDING.md](NOTIFY-HANDLEIDING.md) and [TWITCH-HANDLEIDING.md](TWITCH-HANDLEIDING.md) for detailed setup instructions in Dutch. These companion guides are separate from this English user manual.

For support, go to https://discord.gg/nTzVy5uMWX
