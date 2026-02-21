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
# =========================
# SLASH COMMANDS - NEMO
# =========================

import discord
from discord import app_commands
from discord.ext import commands
import yt_dlp
import asyncio
import random
from datetime import datetime

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True

bot = commands.Bot(command_prefix="!", intents=intents)

# =========================
# VARIABLES GLOBALES
# =========================

# -------- PALABRA DEL DIA --------
daily_words = [
    "Ocean",
    "Curiosity",
    "Dream",
    "Innovation",
    "Future"
]

pdd_usage = {}  # {user_id: [date_string, uses]}

# -------- MUSICA --------
FFMPEG_OPTIONS = {
    'options': '-vn'
}

YDL_OPTIONS = {
    'format': 'bestaudio',
    'noplaylist': True
}

# =========================
# EVENTO READY
# =========================

@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"Bot listo como {bot.user}")

# =========================
# NEMO_PDD (2 veces al dia)
# =========================

@bot.tree.command(name="nemo_pdd", description="Palabra del dia (max 2 veces por usuario)")
async def nemo_pdd(interaction: discord.Interaction):

    user_id = interaction.user.id
    today = datetime.utcnow().strftime("%Y-%m-%d")

    if user_id not in pdd_usage:
        pdd_usage[user_id] = [today, 0]

    stored_date, uses = pdd_usage[user_id]

    if stored_date != today:
        pdd_usage[user_id] = [today, 0]
        uses = 0

    if uses >= 2:
        await interaction.response.send_message(
            "Ya usaste la palabra del dia 2 veces hoy.",
            ephemeral=True
        )
        return

    word = random.choice(daily_words)

    pdd_usage[user_id][1] += 1

    await interaction.response.send_message(
        f"📖 La palabra del dia es: **{word}**"
    )

# =========================
# MUSICA - PLAY
# =========================

@bot.tree.command(name="play", description="Reproduce musica desde YouTube")
@app_commands.describe(url="Link del video de YouTube")
async def play(interaction: discord.Interaction, url: str):

    if not interaction.user.voice:
        await interaction.response.send_message("Debes estar en un canal de voz.", ephemeral=True)
        return

    channel = interaction.user.voice.channel

    if interaction.guild.voice_client is None:
        await channel.connect()
    else:
        await interaction.guild.voice_client.move_to(channel)

    await interaction.response.send_message("Cargando musica...")

    vc = interaction.guild.voice_client

    with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
        info = ydl.extract_info(url, download=False)
        url2 = info['url']
        source = await discord.FFmpegOpusAudio.from_probe(url2, **FFMPEG_OPTIONS)

        vc.play(source)

# =========================
# MUSICA - STOP
# =========================

@bot.tree.command(name="stop", description="Detiene la musica")
async def stop(interaction: discord.Interaction):

    vc = interaction.guild.voice_client

    if vc and vc.is_playing():
        vc.stop()
        await interaction.response.send_message("Musica detenida.")
    else:
        await interaction.response.send_message("No hay musica reproduciendose.", ephemeral=True)

# =========================
# MUSICA - LEAVE
# =========================

@bot.tree.command(name="leave", description="Desconecta el bot del canal de voz")
async def leave(interaction: discord.Interaction):

    vc = interaction.guild.voice_client

    if vc:
        await vc.disconnect()
        await interaction.response.send_message("Me desconecte del canal de voz.")
    else:
        await interaction.response.send_message("No estoy en ningun canal.", ephemeral=True)

# =========================
# TOKEN
# =========================

bot.run("AQUI_TU_TOKEN")

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


