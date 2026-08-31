const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")

const MY_NUMBER = "263776752205" // <-- CHANGE THIS TO YOUR NUMBER

async function startBot() {
    if (!fs.existsSync("./session")) fs.mkdirSync("./session")
    const { state, saveCreds } = await useMultiFileAuthState("./session")

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ghost Bot", "Chrome", "1.0"],
        markOnlineOnConnect: true
    })

    sock.ev.on("creds.update", saveCreds)

    if (!state.creds.registered) {
        console.log("Waiting...")
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(MY_NUMBER)
                console.log("\n=== YOUR CODE: " + code + " ===\n")
            } catch (e) { console.log(e) }
        }, 5000)
    }

    sock.ev.on("connection.update", (u) => {
        const { connection, lastDisconnect } = u
        if (connection === "open") console.log("✅ BOT ONLINE - Ghost Active")
        if (connection === "close") {
            console.log("Closed, restarting...")
            startBot()
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        if (msg.key.fromMe) return
        const jid = msg.key.remoteJid
        if (jid === "status@broadcast") return

        await sock.sendPresenceUpdate("available", jid)
        await sock.sendPresenceUpdate("composing", jid)
        await new Promise(r => setTimeout(r, 4000))
        await sock.sendPresenceUpdate("paused", jid)

        const emojis = ["❤️", "🔥", "😂", "👍", "🥺"]
        const emoji = emojis[Math.floor(Math.random() * emojis.length)]
        try {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } })
            console.log("Reacted " + emoji)
        } catch {}
    })
}

startBot()
