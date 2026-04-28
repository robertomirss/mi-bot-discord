require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');

const path = require('path');
const fs = require('fs');

const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot online");
});

app.listen(process.env.PORT || 3000);

if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Falta DISCORD_TOKEN");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// 🎯 ID del usuario objetivo
const TARGET_USER_ID = "873180047463292988";

let connection;
let isPlaying = false;

const player = createAudioPlayer({
    behaviors: {
        noSubscriber: 'pause'
    }
});

// 🔐 LOGIN
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log("✅ Bot conectado a Discord"))
    .catch(err => {
        console.error("❌ Error login:", err.message);
        process.exit(1);
    });

// 🎧 DETECCIÓN DE VOZ
client.on('voiceStateUpdate', async (oldState, newState) => {

    if (!newState.member || newState.member.user.bot) return;

    const joined =
        newState.channel &&
        newState.member.id === TARGET_USER_ID &&
        (!oldState.channel || oldState.channel.id !== newState.channel.id);

    if (!joined) return;

    console.log(`🧨 Usuario detectado en: ${newState.channel.name}`);

    joinAndPlay(newState.channel);
});

// 🔌 CONECTAR Y REPRODUCIR
async function joinAndPlay(channel) {

    try {
        if (connection) {
            try { connection.destroy(); } catch {}
        }

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false
        });

        connection.subscribe(player);

        await entersState(connection, VoiceConnectionStatus.Ready, 30000);

        console.log("✅ Conectado a voz");

        playAudio();

    } catch (err) {
        console.error("❌ Error voice:", err);
    }
}

// 🎵 REPRODUCIR AUDIO
function playAudio() {

    if (isPlaying) return;
    isPlaying = true;

    const file = path.resolve("./hava_nagila.mp3");

    if (!fs.existsSync(file)) {
        console.error("❌ No existe el audio");
        isPlaying = false;
        return;
    }

    console.log("🔊 REPRODUCIENDO HAVA NAGILA");

    player.stop(true);

    const resource = createAudioResource(file);

    player.play(resource);
}

// 🔁 FIN DE AUDIO
player.on(AudioPlayerStatus.Idle, () => {
    isPlaying = false;
});

// ❌ ERRORES PLAYER
player.on('error', (error) => {
    console.error("❌ Player error:", error);
    isPlaying = false;
    player.stop(true);
});


// 🚪 AUTO-DESCONEXIÓN (NUEVO BLOQUE AÑADIDO)
let leaveTimeout = null;

client.on('voiceStateUpdate', async (oldState, newState) => {

    const channel = oldState.channel || newState.channel;
    if (!channel) return;

    // cancelar si hay actividad
    if (leaveTimeout) {
        clearTimeout(leaveTimeout);
        leaveTimeout = null;
    }

    leaveTimeout = setTimeout(() => {

        const humans = channel.members.filter(m => !m.user.bot);

        if (humans.size === 0) {

            console.log("🚪 Canal vacío → desconectando bot");

            try {
                if (connection) {
                    connection.destroy();
                    connection = null;
                }

                isPlaying = false;

            } catch (err) {
                console.error("Error al desconectar:", err);
            }
        }

    }, 15000); // 15s de espera
});
