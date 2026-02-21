const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActivityType,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const express = require("express");

// ================== CONFIG ==================
const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1473352150187905096";
const GUILD_ID = "1368057208218058752";
const WELCOME_CHANNEL_ID = "1368057208901996625";
const ART_CHANNEL_ID = "1474089674413834442";

const IGNORED_CHANNELS = [
    "1368057208901996634",
    "1368057208901996625",
    "1368057208901996627",
    "1470480658609737869",
    "1396308276597100576"
];

const ROLE_NAME = "🙍‍♂️ || Miembros";

const STAFF_ROLE_NAMES = [
    "Manager",
    "🛐 || Nemo",
    "Bots",
    "🛠️ || Mods/Ganga"
];

// ====== FILTROS ======
const SPAM_LIMIT = 6;
const SPAM_TIME = 5000;

const MENTION_LIMIT = 5;
const MUTE_TIME = 10 * 60 * 1000;

const RAID_LIMIT = 5;
const RAID_TIME = 10000;

// ================== EXPRESS ==================
const app = express();
app.get("/", (req, res) => res.send("Bot activo"));
app.listen(process.env.PORT || 8080);

// ================== CLIENT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================== MAPS ==================
const pddUsage = new Map();
const userMessages = new Map();
let joinTimestamps = [];

// ================= READY =================
client.once("ready", async () => {

    console.log(`✅ Logueado como ${client.user.tag}`);

    const estados = [
        "Hola gente",
        "Ya no soy maid :c",
        "Sabias que los pitufos son pitufos",
        "Hola papulince",
        "Suscribete a Nemo"
    ];

    let index = 0;

    function cambiarEstado() {
        client.user.setPresence({
            status: "idle",
            activities: [{
                name: estados[index],
                type: ActivityType.Watching
            }]
        });

        index = (index + 1) % estados.length;
    }

    cambiarEstado();
    setInterval(cambiarEstado, 60000);

    await registerCommands();
    await changeBannerFromArt();
    setInterval(changeBannerFromArt, 600000);
});

// ================= REGISTRAR SLASH =================
async function registerCommands() {

    const commands = [
        new SlashCommandBuilder()
            .setName("nemo_pdd")
            .setDescription("Palabra del día (2 usos diarios)")
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Slash commands registrados");
}

// ================= INTERACCIONES =================
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "nemo_pdd") {

        const userId = interaction.user.id;
        const today = new Date().toISOString().split("T")[0];

        if (!pddUsage.has(userId)) {
            pddUsage.set(userId, { date: today, uses: 0 });
        }

        const data = pddUsage.get(userId);

        if (data.date !== today) {
            data.date = today;
            data.uses = 0;
        }

        if (data.uses >= 2) {
            return interaction.reply({
                content: "Ya usaste la palabra del día 2 veces hoy.",
                ephemeral: true
            });
        }

        const words = ["flippy" /* No sabia que mas poner entonces puse flippy xd */, "Freddy", "QUESUEÑOHACEESTOMEPASAPORHACERUNBOTDENEMOXDD", "Hola", "Mano"];
        const word = words[Math.floor(Math.random() * words.length)];

        data.uses++;

        interaction.reply(`📖 La palabra del día es: **${word}**`);
    }
});

// ================= BIENVENIDA + ANTI RAID =================
client.on("guildMemberAdd", async member => {

    const now = Date.now();
    joinTimestamps.push(now);
    joinTimestamps = joinTimestamps.filter(t => now - t < RAID_TIME);

    if (joinTimestamps.length >= RAID_LIMIT) {

        console.log("🚨 RAID DETECTADO");

        member.guild.members.cache.forEach(async m => {
            if (!m.user.bot && m.joinedTimestamp > now - RAID_TIME) {
                try { await m.ban({ reason: "Anti Raid" }); } catch {}
            }
        });

        joinTimestamps = [];
        return;
    }

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

    const role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (role) {
        try {
            await member.roles.add(role);
        } catch {}
    }
});

// ================= AUTOMOD =================
client.on("messageCreate", async message => {

    if (!message.guild || message.author.bot) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    const member = message.member;
    if (!member) return;

    if (member.roles.cache.some(r => STAFF_ROLE_NAMES.includes(r.name))) return;

    if (/https?:\/\/|www\./i.test(message.content)) {
        await message.delete().catch(() => {});
        return;
    }

    if (message.mentions.users.size >= MENTION_LIMIT) {
        await message.delete().catch(() => {});
        await member.timeout(MUTE_TIME, "Mention masivo").catch(() => {});
        return;
    }

    const now = Date.now();

    if (!userMessages.has(message.author.id))
        userMessages.set(message.author.id, []);

    const timestamps = userMessages.get(message.author.id);
    timestamps.push(now);

    const recent = timestamps.filter(t => now - t < SPAM_TIME);
    userMessages.set(message.author.id, recent);

    if (recent.length >= SPAM_LIMIT) {
        try {
            await member.timeout(5 * 60 * 1000, "Spam detectado");
        } catch {}
        userMessages.delete(message.author.id);
    }
});

// ================= CAMBIO DE BANNER =================
async function changeBannerFromArt() {

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(ART_CHANNEL_ID);
        if (!channel) return;

        const messages = await channel.messages.fetch({ limit: 100 });

        let images = [];

        messages.forEach(msg => {
            msg.attachments.forEach(att => {
                if (!att.name) return;
                const name = att.name.toLowerCase();
                if (/\.(png|jpg|jpeg|gif|webp)$/.test(name))
                    images.push(att.url);
            });
        });

        if (!images.length) return;

        const randomImage = images[Math.floor(Math.random() * images.length)];

        try {
            await client.user.setBanner(randomImage);
        } catch {}

    } catch (err) {
        console.error("Error cambiando banner:", err);
    }
}

// ================= LOGIN =================
client.login(TOKEN)
  .then(() => console.log("Bot iniciado correctamente"))
  .catch(err => console.error("Error al iniciar:", err));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
