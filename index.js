const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
} = require('@adiwajshing/baileys')
const P = require('pino')
const fs = require('fs')
const chalk = require('chalk')
const ytdl = require('ytdl-core')
const axios = require('axios')

const prefix = '!'
const ownerNumber = '254739320033@s.whatsapp.net' // replace with your WhatsApp ID

const { state, saveState } = useSingleFileAuthState('./auth_info.json')

async function startBot() {
  const { version } = await fetchLatestBaileysVersion()
  console.log(chalk.bold.hex('#FF4500')('\n\n==== ELIAKIM-MD WhatsApp Bot ====\n'))

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
    msgRetryCounterMap: makeCacheableSignalKeyStore(),
    browser: ['ELIAKIM-MD', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...')
        startBot()
      } else {
        console.log('Logged out, please delete auth_info.json and restart')
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp')
    }
  })

  sock.ev.on('creds.update', saveState)

  // Anti-delete feature: listens for deleted messages and resends to owner
  sock.ev.on('messages.delete', async (deleteEvent) => {
    try {
      for (const del of deleteEvent) {
        const { key, message } = del
        if (!message) continue
        const jid = key.remoteJid
        const isGroup = jid.endsWith('@g.us')

        let contentType = Object.keys(message)[0]

        let forwardMsg = { text: `⚠️ A message was deleted:\nType: ${contentType}\n` }
        // Resend any deleted media or text
        if (contentType === 'conversation') {
          forwardMsg.text += `Text: ${message.conversation}`
        } else if (contentType === 'imageMessage') {
          forwardMsg.text += `Image deleted.`
          forwardMsg.image = message.imageMessage
        } else if (contentType === 'videoMessage') {
          forwardMsg.text += `Video deleted.`
          forwardMsg.video = message.videoMessage
        } else if (contentType === 'stickerMessage') {
          forwardMsg.text += `Sticker deleted.`
          forwardMsg.sticker = message.stickerMessage
        } else if (contentType === 'audioMessage') {
          forwardMsg.text += `Audio deleted.`
          forwardMsg.audio = message.audioMessage
        } else {
          forwardMsg.text += `Unknown type.`
        }

        await sock.sendMessage(ownerNumber, forwardMsg)
      }
    } catch (err) {
      console.error('Anti-delete error:', err)
    }
  })

  // Group welcome/left messages
  sock.ev.on('group-participants.update', async (update) => {
    const groupId = update.id
    for (const participant of update.participants) {
      if (update.action === 'add') {
        await sock.sendMessage(groupId, {
          text: `Welcome @${participant.split('@')[0]} to the group!`,
          mentions: [participant]
        })
      }
      if (update.action === 'remove') {
        await sock.sendMessage(groupId, {
          text: `Goodbye @${participant.split('@')[0]}!`,
          mentions: [participant]
        })
      }
    }
  })

  // Message handler with owner/admin-only commands and downloaders
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const isGroup = sender.endsWith('@g.us')
    const messageContent =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    // Commands only triggered by prefix !
    if (!messageContent.startsWith(prefix)) return

    const args = messageContent.slice(prefix.length).trim().split(/ +/)
    const cmd = args.shift().toLowerCase()

    // Helper to check if sender is owner (or admin, stubbed for now)
    const isOwner = sender === ownerNumber
    const isAdmin = isOwner // Expand this with group admin check if needed

    // Owner/admin-only command stub
    const ownerOnlyCommands = ['shutdown', 'broadcast']

    if (ownerOnlyCommands.includes(cmd) && !isOwner) {
      await sock.sendMessage(sender, { text: 'This command is owner-only.' })
      return
    }

    switch (cmd) {
      case 'ping': {
        const start = Date.now()
        await sock.sendMessage(sender, { text: 'Pinging...' })
        const latency = Date.now() - start
        await sock.sendMessage(sender, { text: `Pong! Response time: ${latency} ms` })
        break
      }
      case 'alive': {
        await sock.sendMessage(sender, {
          text: 'ELIAKIM-MD Bot is *online* and running smoothly! 🚀',
        })
        break
      }
      case 'download': {
        // Downloader stub: YouTube/Instagram, etc.
        const url = args[0]
        if (!url) {
          await sock.sendMessage(sender, { text: 'Please provide a link (YouTube, Instagram, etc.)' })
          return
        }
        // YouTube downloader example:
        if (/youtube\.com|youtu\.be/.test(url)) {
          try {
            const info = await ytdl.getInfo(url)
            const format = ytdl.chooseFormat(info.formats, { quality: '18' }) // mp4
            if (format && format.url) {
              await sock.sendMessage(sender, {
                video: { url: format.url },
                mimetype: 'video/mp4',
                caption: `Downloaded from YouTube: ${info.videoDetails.title}`
              })
            } else {
              await sock.sendMessage(sender, { text: 'Could not find video format.' })
            }
          } catch (e) {
            await sock.sendMessage(sender, { text: `Error downloading: ${e.message}` })
          }
        } else if (/instagram\.com/.test(url)) {
          // Instagram downloader stub (needs real API/service)
          await sock.sendMessage(sender, { text: 'Instagram download feature coming soon!' })
        } else {
          await sock.sendMessage(sender, { text: 'Unsupported link type.' })
        }
        break
      }
      case 'shutdown': {
        await sock.sendMessage(sender, { text: 'Bot shutting down.' })
        await sock.logout()
        process.exit(0)
        break
      }
      case 'broadcast': {
        // Example broadcast to all groups (owner-only)
        const text = args.join(' ')
        if (!text) {
          await sock.sendMessage(sender, { text: 'Please provide a message to broadcast.' })
          return
        }
        // Get all group chats and send message
        const chats = await sock.groupFetchAllParticipating()
        for (const groupId of Object.keys(chats)) {
          await sock.sendMessage(groupId, { text: `[Broadcast]\n${text}` })
        }
        await sock.sendMessage(sender, { text: 'Broadcast sent.' })
        break
      }
      default:
        await sock.sendMessage(sender, { text: 'Unknown command.' })
    }
  })

  // Save session on process exit
  process.on('SIGINT', async () => {
    console.log('\nShutting down...')
    await sock.logout()
    process.exit(0)
  })
}

startBot()
