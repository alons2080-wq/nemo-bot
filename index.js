const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus 
} = require('@discordjs/voice');

const play = require('play-dl');

const queues = new Map();

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType,
    REST,
    Routes,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');

const express = require('express');

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
// ============================================


// ===== Railway Web Server =====
const app = express();
app.get("/", (req, res) => res.send("Bot activo"));
app.listen(process.env.PORT || 8080);

// ===== Cliente =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= READY =================
client.once("clientReady", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    // ===== ESTADOS ROTATIVOS =====
    const estados = [
        " Hola gente",   // Estado 1
        " Ya no soy maid :c",   // Estado 2
        " Sabias que los pitufos, papa pitufo, y pitufina, son pitufos",   // Estado 3
        " Hola papulince",   // Estado 4
        " Suscribete a Nemo. Dale :D"    // Estado 5
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

    cambiarEstado(); // Ejecuta inmediatamente
    setInterval(cambiarEstado, 60 * 1000); // Cambia cada 1 minuto

    await registerCommands();
    await changeBannerFromArt();
    setInterval(changeBannerFromArt, 10 * 60 * 1000);
});
// ================= SLASH COMMANDS =================
// ===== PALABRA DEL DIA =====
const dailyWords = [
    "Ocean",
    "Curiosity",
    "Dream",
    "Innovation",
    "Future"
];

const pddUsage = new Map(); // userId -> { date, uses }

// ===== MUSICA =====
const musicPlayers = new Map(); // guildId -> { connection, player }

// ================= REGISTRAR COMANDOS =================
async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName("nemo_pdd")
            .setDescription("Palabra del dia (max 2 veces por usuario)"),

        new SlashCommandBuilder()
            .setName("play")
            .setDescription("Reproduce musica desde YouTube")
            .addStringOption(option =>
                option.setName("url")
                    .setDescription("Link del video")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("stop")
            .setDescription("Detiene la musica"),

        new SlashCommandBuilder()
            .setName("leave")
            .setDescription("Desconecta el bot del canal de voz")

    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("Slash commands registrados.");
}

// ================= MANEJADOR =================
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // ================= PDD =================
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
                content: "Ya usaste la palabra del dia 2 veces hoy.",
                ephemeral: true
            });
        }

        const word = dailyWords[Math.floor(Math.random() * dailyWords.length)];
        data.uses++;

        return interaction.reply(`📖 La palabra del dia es: **${word}**`);
    }

    // ================= PLAY =================
    if (commandName === "play") {

        const url = interaction.options.getString("url");

        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: "Debes estar en un canal de voz.",
                ephemeral: true
            });
        }

        await interaction.reply("🎵 Cargando musica...");

        const channel = interaction.member.voice.channel;

        let connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });
        }

        const stream = await play.stream(url);
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
    }

    // ================= STOP =================
    if (commandName === "stop") {

        const data = musicPlayers.get(interaction.guild.id);

        if (!data) {
            return interaction.reply({
                content: "No hay musica reproduciendose.",
                ephemeral: true
            });
        }

        data.player.stop();

        return interaction.reply("⏹ Musica detenida.");
    }

    // ================= LEAVE =================
    if (commandName === "leave") {

        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return interaction.reply({
                content: "No estoy en un canal.",
                ephemeral: true
            });
        }

        connection.destroy();
        musicPlayers.delete(interaction.guild.id);

        return interaction.reply("👋 Me desconecte del canal.");
    }

});

// ================= BIENVENIDA + ANTI RAID =================
let joinTimestamps = [];

client.on("guildMemberAdd", async (member) => {

    const now = Date.now();
    joinTimestamps.push(now);
    joinTimestamps = joinTimestamps.filter(time => now - time < RAID_TIME);

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
const userMessages = new Map();

client.on("messageCreate", async (message) => {

    if (!message.guild) return;
    if (message.author.bot) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    const member = message.member;
    if (!member) return;

    if (member.roles.cache.some(role => STAFF_ROLE_NAMES.includes(role.name))) return;

    if (/https?:\/\/|www\./i.test(message.content)) {
        await message.delete().catch(()=>{});
        return;
    }

    if (message.mentions.users.size >= MENTION_LIMIT) {
        await message.delete().catch(()=>{});
        await member.timeout(MUTE_TIME, "Mention masivo").catch(()=>{});
        return;
    }

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

                if (
                    name.endsWith(".png") ||
                    name.endsWith(".jpg") ||
                    name.endsWith(".jpeg") ||
                    name.endsWith(".gif") ||
                    name.endsWith(".webp")
                ) {
                    images.push(att.url);
                }
            });
        });

        if (images.length === 0) return;

        const randomImage = images[Math.floor(Math.random() * images.length)];
        await client.user.setBanner(randomImage);

        console.log("Banner actualizado.");

    } catch (error) {
        console.error("Error cambiando banner:", error);
    }
}

// ================= LOGIN =================
client.login(TOKEN);

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);




