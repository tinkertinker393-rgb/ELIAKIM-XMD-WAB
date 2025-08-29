# ELIAKIM-MD WhatsApp Bot

> A multi-feature WhatsApp bot using Baileys, designed for owner/admin command control, auto-reply, anti-delete, downloaders, and group management.

## Features

- Prefix-based auto-reply commands (use `!` prefix)
- Group welcome/left messages
- Owner/admin-only commands (`!shutdown`, `!broadcast`)
- YouTube downloader (`!download <youtube_url>`)
- Instagram downloader (stub; coming soon)
- Anti-delete (resends deleted messages/media to owner's DM)
- Hosted via GitHub Actions

## Getting Started

1. Clone the repo
2. Install dependencies  
   ```
   npm install
   ```
3. Run the bot locally  
   ```
   npm start
   ```
   Or use GitHub Actions for hosting.

## Usage

- All bot commands use the `!` prefix, e.g.:
  - `!ping`
  - `!alive`
  - `!download <youtube_url>`
  - `!broadcast <message>`
  - `!shutdown`

## Owner/Admin Commands

- Only the owner (WhatsApp number in code) can run owner-only commands.

## Anti-Delete

- Any deleted message (text, image, video, sticker, audio) in groups or private chats is resent to your DM.

## Group Management

- When a member joins: `Welcome @username to the group!`
- When a member leaves: `Goodbye @username!`

## GitHub Actions Hosting

See `.github/workflows/bot.yml`.

## License

MIT