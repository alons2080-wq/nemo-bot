const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType 
} = require('discord.js');

const express = require("express");

// ===== CONFIGURATION =====
const PORT = process.env.PORT;

if (!PORT) {
    console.error("No PORT found. Railway needs a PORT environment variable.");
    process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server activo en puerto ${PORT}`);
});

const WELCOME_CHANNEL_ID = "1368057208901996625";
const ROLE_NAME = "🙍‍♂️ || Miembros";
// =========================

// Crear cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== READY EVENT =====
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Estado del bot
    client.user.setPresence({
        status: 'idle', // online | idle | dnd | invisible
        activities: [{
            name: 'Hola soy Nemo pero Bot',
            type: ActivityType.Watching
        }]
    });
});

// ===== NUEVO MIEMBRO =====
client.on('guildMemberAdd', async (member) => {
    try {

        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle("Bienvenido al server!")
            .setDescription(`Hola ${member}, estamos felices de tenerte aqui!`)
            .setColor(0xFA8072)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: "Nemo Bot" })
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        const role = member.guild.roles.cache.find(r => r.name === ROLE_NAME);
        if (role) {
            await member.roles.add(role);
            console.log(`Role given to ${member.user.tag}`);
        } else {
            console.log("Role not found");
        }

    } catch (error) {
        console.error("Error handling new member:", error);
    }
});

// ===== LOGIN =====
client.login(TOKEN);

// ===== MANEJO DE ERRORES =====
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// ===== SERVIDOR WEB (IMPORTANTE PARA RAILWAY) =====
const app = express();

app.get("/", (req, res) => {
    res.send("Nemo Bot activo");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Web server activo");
});

