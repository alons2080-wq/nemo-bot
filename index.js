// ================== IMPORTS ==================
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
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ================== CONFIG ==================
const TOKEN = process.env.TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CLIENT_ID = "1473352150187905096";
const GUILD_ID = "1368057208218058752";
const WELCOME_CHANNEL_ID = "1368057208901996625";
const ART_CHANNEL_ID = "1474089674413834442";
const CONFESION_CHANNEL_ID = "1475251478410170428";

const IGNORED_CHANNELS = [
    "1368057208901996634",
    "1368057208901996625",
    "1368057208901996627",
    "1470480658609737869",
    "1396308276597100576"
];

const ROLE_NAME = "🙍‍♂️ || Miembros";

// ================== IA ==================
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
});

// ================= SLASH COMMANDS =================
async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName("nemo_pdd")
            .setDescription("Palabra del día"),

        new SlashCommandBuilder()
            .setName("nemo_confecion")
            .setDescription("Confesión anónima")
            .addStringOption(option =>
                option.setName("mensaje")
                    .setDescription("Tu mensaje")
                    .setRequired(true)
            )

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

    // ===== PDD =====
    if (interaction.commandName === "nemo_pdd") {

        const words = ["Ocean", "Curiosity", "Dream", "Innovation", "Future"];
        const word = words[Math.floor(Math.random() * words.length)];

        return interaction.reply(`📖 Palabra: **${word}**`);
    }

    // ===== CONFESION =====
    if (interaction.commandName === "nemo_confecion") {

        const mensaje = interaction.options.getString("mensaje");
        const canal = interaction.guild.channels.cache.get(CONFESION_CHANNEL_ID);

        if (!canal) {
            return interaction.reply({ content: "Error canal", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle("📩 Confesión")
            .setDescription(mensaje)
            .setColor(0xff66cc);

        await canal.send({ embeds: [embed] });

        return interaction.reply({
            content: "Enviado 🤫",
            ephemeral: true
        });
    }

});

// ================= IA (MENSAJES) =================
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;
    if (IGNORED_CHANNELS.includes(message.channel.id)) return;

    // Solo responde si lo mencionan
    if (!message.mentions.has(client.user)) return;

    const prompt = message.content.replace(/<@!?\\d+>/g, "").trim();

    if (!prompt) {
        return message.reply("¿Qué quieres?");
    }

    try {

        const result = await model.generateContent([
            {
                text: "Eres Nemo Bot, un bot divertido, sarcástico, usas humor latino y memes."
            },
            {
                text: prompt
            }
        ]);

        const response = result.response.text();

        const finalText = response.length > 2000
            ? response.slice(0, 2000)
            : response;

        message.reply(finalText);

    } catch (err) {
        console.error(err);
        message.reply("Error con la IA 😢");
    }

});

// ================= BIENVENIDA =================
client.on("guildMemberAdd", async member => {

    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle("Bienvenido!")
            .setDescription(`Hola ${member}, disfruta de tu estadia en el servidor`)
            .setColor(0x00ff99);

        channel.send({ embeds: [embed] });
    }

    const role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (role) {
        try { await member.roles.add(role); } catch {}
    }
});

// ================= LOGIN =================
client.login(TOKEN);

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
