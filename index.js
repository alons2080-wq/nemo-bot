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
        " Ya no puedo ser maid :c",   // Estado 1
        " Hola gente xd",   // Estado 2
        " Ya no se q poner de estado realmente",   // Estado 3
        " Recuerda q me creo MrRat0 xd",   // Estado 4
        " Pagina Oficial: https://nemo-web.onrender.com"    // Estado 5
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

// ================= SLASH COMMAND =================

async function registerCommands() {

    const commands = [
        new SlashCommandBuilder()
            .setName("nemo_pdd")
            .setDescription("Palabra del día")
    ];

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands.map(cmd => cmd.toJSON()) }
    );

    console.log("Slash command registrado.");
}

const palabras = [
    "Oscuridad",
    "Sombras",
    "Destino",
    "Silencio",
    "Animatrónico",
    "Sobrevivir",
    "Pesadilla",
    "Vigilia",
    "Ecos",
    "Susurro"
];

let lastUsedPDD = 0;

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "nemo_pdd") {

        const now = Date.now();

        if (now - lastUsedPDD < 24 * 60 * 60 * 1000) {

            const remaining = 24 * 60 * 60 * 1000 - (now - lastUsedPDD);
            const hours = Math.floor(remaining / (1000 * 60 * 60));

            return interaction.reply({
                content: `⏳ Ya se usó hoy. Espera ${hours} horas.`,
                flags: MessageFlags.Ephemeral
            });
        }

        lastUsedPDD = now;

        const palabra = palabras[Math.floor(Math.random() * palabras.length)];

        const embed = new EmbedBuilder()
            .setTitle("📖 Palabra del Día")
            .setDescription(`La palabra de hoy es:\n\n**${palabra}**`)
            .setColor(0x2b2d31)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
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
            .setTitle("Bienvenido Usuario!")
            .setDescription(`Hola ${member}, y bienvenido a Nemo´s, este es el servidor oficial de Nemo_704.`)
            .setColor(0x00ff99)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        channel.send({ embeds: [embed] });
    }

    const role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (role) await member.roles.add(role);
});

// ================= AUTOMOD + RESPUESTAS =================
const userMessages = new Map();

client.on("messageCreate", async (message) => {

    if (!message.guild) return;
    if (message.author.bot) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    const member = message.member;
    if (!member) return;

    // ===== RESPUESTAS AUTOMÁTICAS =====
    const contenido = message.content.toLowerCase();

    if (
        contenido.includes("hola bot") ||
        contenido.includes("hola nemo bot") ||
        contenido.includes("Hola Nemo Bot") ||
        contenido.includes("Hola bot") ||
    ) {
        return message.reply("Hola usuario, ¿Como estas? Por que yo bastante bien, aunque no me lo preguntaron, que maleducados, los voy a acusar con su mamá para que les de sus nalgadas.");
    }

    // ===== IGNORAR STAFF =====
    if (member.roles.cache.some(role => STAFF_ROLE_NAMES.includes(role.name))) return;

    // ===== ANTI LINKS =====
    if (/https?:\/\/|www\./i.test(message.content)) {
        await message.delete().catch(()=>{});
        return;
    }

    // ===== MENTION MASIVO =====
    if (message.mentions.users.size >= MENTION_LIMIT) {
        await message.delete().catch(()=>{});
        await member.timeout(MUTE_TIME, "Mention masivo").catch(()=>{});
        return;
    }

    // ===== SPAM =====
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










