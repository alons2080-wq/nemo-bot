const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ===== CONFIGURATION =====
const TOKEN = process.env.TOKEN;
const WELCOME_CHANNEL_ID = "1368057208901996625";
const ROLE_NAME = "🙍‍♂️ || Miembros";
// =========================

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Set bot status to Idle
    client.user.setPresence({
        status: 'idle', // online | idle | dnd | invisible
        activities: [{
            name: 'Welcoming new members',
            type: ActivityType.Watching
        }]
    });
});

client.on('guildMemberAdd', async (member) => {

    try {

        // Get welcome channel
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) return;

        // Create welcome embed
        const embed = new EmbedBuilder()
            .setTitle("Bienvenido al server!")
            .setDescription(`Hola ${member}, estamos felices de tenerte aqui!`)
            .setColor(0xFA8072) // Salmon color
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: "Nemo Bot" })
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        // Give role automatically
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

client.login(TOKEN);
