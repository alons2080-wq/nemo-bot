const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType 
} = require('discord.js');

const express = require("express");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;

const WELCOME_CHANNEL_ID = "1368057208901996625";
const ROLE_NAME = "🙍‍♂️ || Miembros";

const ART_CHANNEL_ID = "1474089674413834442";

// Roles ignorados
const STAFF_ROLE_NAMES = [
    "Manager",
    "🛐 || Nemo",
    "Bots",
    "🛠️ || Mods/Ganga"
];

// 5 canales donde NO aplica automod
const IGNORED_CHANNELS = [
    "PON_ID_1",
    "PON_ID_2",
    "PON_ID_3",
    "PON_ID_4",
    "PON_ID_5"
];

// Filtros
const SPAM_LIMIT = 6;
const SPAM_TIME = 5000;

const MENTION_LIMIT = 5;
const MUTE_TIME = 600000; // 10 minutos

const RAID_LIMIT = 5;
const RAID_TIME = 10000;

// ==========================================

// ===== SERVIDOR WEB (Railway) =====
const app = express();

app.get("/", (req, res) => {
    res.send("Hola, soy Nemo Bot xd");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server activo en puerto ${PORT}`);
});

// ===== CLIENTE DISCORD =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= READY =================
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        status: 'idle',
        activities: [{
            name: 'Modo Seguridad Activo',
            type: ActivityType.Watching
        }]
    });

    // Cambiar avatar al iniciar y cada 10 min
    changeAvatarFromArt();
    setInterval(changeAvatarFromArt, 10 * 60 * 1000);
});

// =============== BIENVENIDA + ANTI RAID ===============
let joinTimestamps = [];

client.on('guildMemberAdd', async (member) => {

    const now = Date.now();
    joinTimestamps.push(now);
    joinTimestamps = joinTimestamps.filter(time => now - time < RAID_TIME);

    // ANTI RAID
    if (joinTimestamps.length >= RAID_LIMIT) {

        console.log("🚨 RAID DETECTADO");

        member.guild.members.cache.forEach(async m => {
            if (!m.user.bot && m.joinedTimestamp > now - RAID_TIME) {
                try {
                    await m.ban({ reason: "Anti Raid" });
                } catch {}
            }
        });

        joinTimestamps = [];
        return;
    }

    // BIENVENIDA
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle("Bienvenido!")
            .setDescription(`Hola ${member}, disfruta tu estancia.`)
            .setColor(0x00ff99)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        channel.send({ embeds: [embed] });
    }

    // AUTO ROL
    const role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (role) await member.roles.add(role);

});

// ================= AUTOMOD =================
const userMessages = new Map();

client.on("messageCreate", async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    const member = message.member;
    if (!member) return;

    if (member.roles.cache.some(role => STAFF_ROLE_NAMES.includes(role.name))) return;

    // BLOQUEAR LINKS
    if (/https?:\/\/|www\./i.test(message.content)) {
        await message.delete().catch(()=>{});
        return;
    }

    // MENTION MASIVO
    if (message.mentions.users.size >= MENTION_LIMIT) {
        await message.delete().catch(()=>{});
        await member.timeout(MUTE_TIME, "Mention masivo").catch(()=>{});
        return;
    }

    // SPAM
    const now = Date.now();

    if (!userMessages.has(message.author.id)) {
        userMessages.set(message.author.id, []);
    }

    const timestamps = userMessages.get(message.author.id);
    timestamps.push(now);

    const recent = timestamps.filter(time => now - time < SPAM_TIME);
    userMessages.set(message.author.id, recent);

    if (recent.length >= SPAM_LIMIT) {
        try {
            await member.ban({ reason: "Spam automático" });
        } catch {}

        userMessages.delete(message.author.id);
    }

});

// ================= CAMBIO DE AVATAR =================
async function changeAvatarFromArt() {
    try {
        const channel = await client.channels.fetch(ART_CHANNEL_ID);
        if (!channel) return;

        const messages = await channel.messages.fetch({ limit: 100 });

        const images = messages
            .flatMap(msg => Array.from(msg.attachments.values()))
            .filter(att => {
                const name = att.name.toLowerCase();
                return (
                    name.endsWith(".png") ||
                    name.endsWith(".jpg") ||
                    name.endsWith(".jpeg") ||
                    name.endsWith(".gif") ||
                    name.endsWith(".webp")
                );
            });

        if (images.length === 0) return;

        const randomImage = images[Math.floor(Math.random() * images.length)];

        await client.user.setAvatar(randomImage.url);

        console.log("Avatar actualizado.");

    } catch (error) {
        console.error("Error cambiando avatar:", error);
    }
}

// ================= LOGIN =================
client.login(TOKEN);

// ================= ERRORES =================
process.on('unhandledRejection', error => console.error(error));
process.on('uncaughtException', error => console.error(error));
