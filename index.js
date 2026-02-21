const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection
} = require("@discordjs/voice");

const play = require("play-dl");

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

// ================== EXPRESS (Railway) ==================
const app = express();
app.get("/", (req, res) => res.send("Bot activo"));
app.listen(process.env.PORT || 8080);

// ================== CLIENT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ================== MAPS ==================
const musicPlayers = new Map();
const pddUsage = new Map();
const userMessages = new Map();
let joinTimestamps = [];

// ================= READY =================
client.once("ready", async () => {

    console.log(`✅ Logueado como ${client.user.tag}`);

    // ===== ESTADOS ROTATIVOS =====
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
    setInterval(cambiarEstado, 60 * 1000);

    await registerCommands();
    await changeBannerFromArt();
    setInterval(changeBannerFromArt, 10 * 60 * 1000);
});

// ================= REGISTRAR SLASH =================
async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName("nemo_pdd")
            .setDescription("Palabra del día (2 usos diarios)"),

        new SlashCommandBuilder()
            .setName("play")
            .setDescription("Reproduce música desde YouTube")
            .addStringOption(option =>
                option.setName("url")
                    .setDescription("Link del video")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("stop")
            .setDescription("Detiene la música"),

        new SlashCommandBuilder()
            .setName("leave")
            .setDescription("Desconecta el bot del canal")

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

    const { commandName } = interaction;

    // ===== PALABRA DEL DIA =====
    if (commandName === "nemo_pdd") {

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

        const words = ["Ocean", "Curiosity", "Dream", "Innovation", "Future"];
        const word = words[Math.floor(Math.random() * words.length)];

        data.uses++;

        return interaction.reply(`📖 La palabra del día es: **${word}**`);
    }

    // ===== PLAY =====
if (commandName === "play") {

    if (!interaction.member.voice.channel) {
        return interaction.reply({
            content: "Debes estar en un canal de voz.",
            flags: 64
        });
    }

    const url = interaction.options.getString("url");

    if (!url) {
        return interaction.reply({
            content: "Debes proporcionar un link válido.",
            flags: 64
        });
    }

    await interaction.deferReply();

    try {

        const channel = interaction.member.voice.channel;

        let connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });
        }

        let stream;

        if (play.yt_validate(url) === "video") {
            stream = await play.stream(url);
        } else {
            return interaction.editReply("El link no es válido.");
        }

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        let player;

        if (musicPlayers.has(interaction.guild.id)) {
            player = musicPlayers.get(interaction.guild.id).player;
        } else {
            player = createAudioPlayer();
            connection.subscribe(player);
            musicPlayers.set(interaction.guild.id, { connection, player });
        }

        player.play(resource);

        return interaction.editReply("🎵 Reproduciendo música.");

    } catch (err) {
        console.error("Error en /play:", err);
        return interaction.editReply("Ocurrió un error al intentar reproducir.");
    }
}

    // ===== STOP =====
if (commandName === "stop") {

    const data = musicPlayers.get(interaction.guild.id);

    if (!data) {
        return interaction.reply({
            content: "No hay música reproduciéndose.",
            flags: 64
        });
    }

    data.player.stop();
    return interaction.reply("⏹ Música detenida.");
}
    
    // ===== LEAVE =====
if (commandName === "leave") {

    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
        return interaction.reply({
            content: "No estoy en un canal.",
            flags: 64
        });
    }

    connection.destroy();
    musicPlayers.delete(interaction.guild.id);

    return interaction.reply("👋 Me desconecté del canal.");
}

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
    if (role) await member.roles.add(role);
});

// ================= AUTOMOD =================
client.on("messageCreate", async message => {

    if (!message.guild || message.author.bot) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    const member = message.member;
    if (!member) return;

    if (member.roles.cache.some(r => STAFF_ROLE_NAMES.includes(r.name))) return;

    // Anti links
    if (/https?:\/\/|www\./i.test(message.content)) {
        await message.delete().catch(() => {});
        return;
    }

    // Anti menciones
    if (message.mentions.users.size >= MENTION_LIMIT) {
        await message.delete().catch(() => {});
        await member.timeout(MUTE_TIME, "Mention masivo").catch(() => {});
        return;
    }

    // Anti spam
    const now = Date.now();

    if (!userMessages.has(message.author.id))
        userMessages.set(message.author.id, []);

    const timestamps = userMessages.get(message.author.id);
    timestamps.push(now);

    const recent = timestamps.filter(t => now - t < SPAM_TIME);
    userMessages.set(message.author.id, recent);

    if (recent.length >= SPAM_LIMIT) {
        try { await member.ban({ reason: "Spam automático" }); } catch {}
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
        await client.user.setBanner(randomImage);

        console.log("✅ Banner actualizado");

    } catch (err) {
        console.error("Error cambiando banner:", err);
    }
}

// ================= LOGIN =================
client.login(process.env.TOKEN)
  .then(() => console.log("Bot iniciado correctamente"))
  .catch(err => console.error("Error al iniciar:", err));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);


