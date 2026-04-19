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

// ================== ENV ==================
const TOKEN = process.env.TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("TOKEN RAW:", TOKEN);
console.log("GEMINI RAW:", GEMINI_API_KEY);

console.log("TOKEN:", TOKEN ? "OK" : "MISSING");
console.log("GEMINI:", GEMINI_API_KEY ? "OK" : "MISSING");

if (!TOKEN || !GEMINI_API_KEY) {
    console.error("❌ Faltan variables de entorno");
    process.exit(1);
}

// ================== CONFIG ==================
const CLIENT_ID = "1473352150187905096";
const GUILD_ID = "1368057208218058752";
const WELCOME_CHANNEL_ID = "1368057208901996625";
const CONFESION_CHANNEL_ID = "1475251478410170428";

const IGNORED_CHANNELS = [
    "1368057208901996634"
];

// ================== IA ==================
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
});

// ================== EXPRESS ==================
const app = express();
app.get("/", (req, res) => res.send("✅ Nemo Bot activo"));
app.listen(process.env.PORT || 8080, "0.0.0.0", () => {
    console.log("🌐 Servidor web activo");
});

// ================== CLIENT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ================== READY ==================
client.once("ready", async () => {

    console.log(`✅ Conectado como ${client.user.tag}`);

    const estados = [
        "Hola gente XD",
        "Ya no mas maid (Lamentable)",
        "Te veo 👀",
        "Soy Nemo Bot XD",
        "A nemo le cabe 42 dedos en el culo"
    ];

    let i = 0;

    setInterval(() => {
        client.user.setPresence({
            status: "idle",
            activities: [{
                name: estados[i],
                type: ActivityType.Watching
            }]
        });
        i = (i + 1) % estados.length;
    }, 60000);

    await registerCommands();
});

// ================== SLASH COMMANDS ==================
async function registerCommands() {
    try {

        const commands = [
            new SlashCommandBuilder()
                .setName("ping")
                .setDescription("Responde pong"),

            new SlashCommandBuilder()
                .setName("confesion")
                .setDescription("Confesión anónima")
                .addStringOption(opt =>
                    opt.setName("mensaje")
                        .setDescription("Tu mensaje")
                        .setRequired(true)
                )
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("✅ Slash commands listos");

    } catch (err) {
        console.error("❌ Error registrando comandos:", err);
    }
}

// ================== INTERACTIONS ==================
client.on("interactionCreate", async interaction => {

    try {

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "ping") {
            return interaction.reply("🏓 Pong!");
        }

        if (interaction.commandName === "confesion") {

            const mensaje = interaction.options.getString("mensaje");
            const canal = interaction.guild.channels.cache.get(CONFESION_CHANNEL_ID);

            if (!canal) {
                return interaction.reply({
                    content: "❌ Canal no encontrado",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("🕵️ Confesión Anónima")
                .setDescription(`"${mensaje}"`)
                .setColor(0xff66cc)
                .setFooter({ text: "Confesión enviada de forma anónima" })
                .setTimestamp();

            const msg = await canal.send({ embeds: [embed] });

            return interaction.reply({
                content: "✅ Confesión enviada",
                ephemeral: true
            });
        }

    } catch (err) {
        console.error("❌ Error en interaction:", err);
    }
});

// ================== IA MENSAJES ==================
client.on("messageCreate", async (message) => {

    try {

        if (message.author.bot) return;
        if (IGNORED_CHANNELS.includes(message.channel.id)) return;
        if (!message.mentions.has(client.user)) return;

        console.log("📩 Mensaje:", message.content);

        const prompt = message.content.replace(/<@!?\\d+>/g, "").trim();

        if (!prompt) {
            return message.reply("❓ Escribe algo después de mencionarme");
        }

        await message.channel.sendTyping();

        const result = await model.generateContent([
            { text: "Eres Nemo Bot, gracioso, sarcástico, estilo streamer latino." },
            { text: prompt }
        ]);

        const response = result.response.text();

        console.log("🤖 Respuesta:", response);

        const reply = response?.slice(0, 2000) || "No pude responder 😵";

        await message.reply(reply);

    } catch (error) {

        console.error("❌ Error IA:", error);

        message.reply("⚠️ Error con la IA");
    }
});

// ================== BIENVENIDA ==================
client.on("guildMemberAdd", async member => {

    const canal = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!canal) return;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: `${member.user.username} se unió 👋`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`Hola ${member}, disfruta tu estancia.`)
        .setColor(0x00ff99)
        .setTimestamp();

    canal.send({ embeds: [embed] });
});

// ================== ERRORES ==================
process.on("unhandledRejection", err => {
    console.error("❌ UnhandledRejection:", err);
});

process.on("uncaughtException", err => {
    console.error("❌ UncaughtException:", err);
});

// ================== LOGIN ==================
client.login(TOKEN)
    .then(() => console.log("🚀 Bot iniciado correctamente"))
    .catch(err => console.error("❌ Error login:", err));
