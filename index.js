const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")

// PUT YOUR NUMBER HERE - with country code, NO +
// Example: Zimbabwe 263771234567
const MY_NUMBER = "263776752205"

async function startBot() {
    // Create session folder if not exists
    if (!fs.existsSync("./session")) {
        fs.mkdirSync("./session")
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session")

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ghost Bot", "Chrome", "1.0"],
        markOnlineOnConnect: true
    })

    sock.ev.on("creds.update", saveCreds)

    // PAIRING CODE - if not registered
    if (!state.creds.registered) {
        console.log("Waiting 5 sec to generate pairing code...")
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(MY_NUMBER)
                console.log("\n=================================")
                console.log("YOUR PAIRING CODE: " + code)
                console.log("Go to WhatsApp > Linked Devices > Link with phone number")
                console.log("=================================\n")
            } catch (e) {
                console.log("Error getting code:", e)
            }
        }, 5000)
    }

    sock.ev.on("connection.update", (update) => {
        const { connection } = update
        if (connection === "open") {
            console.log("✅ GHOST BOT ONLINE - Always Online Active")
        }
        if (connection === "close") {
            console.log("Connection closed, restarting...")
            startBot()
        }
    })

    // === MAIN GHOST LOGIC ===
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        if (msg.key.fromMe) return // don't react to own messages

        const jid = msg.key.remoteJid
        if (jid === "status@broadcast") return // ignore status

        // 1. ALWAYS ONLINE GHOST - stay online
        await sock.sendPresenceUpdate("available", jid)

        // 2. TYPING GHOST - show typing for 4 seconds
        await sock.sendPresenceUpdate("composing", jid)
        await new Promise(resolve => setTimeout(resolve, 4000))
        await sock.sendPresenceUpdate("paused", jid)

        // 3. AUTO REACTER GHOST - react with random emoji
        const emojis = ["❤️", "🔥", "😂", "👍", "🥺", "😎", "💀"]
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: randomEmoji,
                    key: msg.key
                }
            })
            console.log(`Reacted ${randomEmoji} to message from ${jid}`)
        } catch (e) {
            console.log("Failed to react")
        }
    })
}

startBot()
