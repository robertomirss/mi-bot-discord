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

// 🌐 SERVIDOR (Render / uptime)
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot online");
});

app.listen(process.env.PORT || 3000);

// 🔐 TOKEN CHECK
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Falta DISCORD_TOKEN en variables de entorno");
    process.exit(1);
}

// 🤖 CLIENTE DISCORD
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// 🎯 USUARIO OBJETIVO
const TARGET_USER_ID = "873180047463292988";

// 🎧 AUDIO PLAYER
let connection;
const player = createAudioPlayer({
    behaviors: {
        noSubscriber: 'pause'
    }
});

let isPlaying = false;

// 🔐 LOGIN
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log("✅ Bot conectado a Discord"))
    .catch(err => {
        console.error("❌ Error login:", err.message);
        process.exit(1);
    });

// 🧠 DETECCIÓN DE VOZ
client.on('voiceStateUpdate', async (oldState, newState) => {

    if (!newState.member || newState.member.user.bot) return;

    const joined =
        !oldState.channel &&
        newState.channel &&
        newState.member.id === TARGET_USER_ID;

    if (!joined) return;

    console.log(`🧨 Usuario detectado en: ${newState.channel.name}`);

    await joinAndPlay(newState.channel);
});

// 🔌 CONECTAR A VOZ
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

// 🎵 REPRODUCCIÓN DE AUDIO
function playAudio() {

    if (isPlaying) return;
    isPlaying = true;

    const file = path.resolve("./hava_nagila.mp3");

    console.log("🎧 Archivo usado:", file);

    if (!fs.existsSync(file)) {
        console.error("❌ No se encontró hava_nagila.mp3");
        isPlaying = false;
        return;
    }

    try {
        console.log("🔊 REPRODUCIENDO HAVA NAGILA 🔥");

        player.stop(true);

        const resource = createAudioResource(file);

        player.play(resource);

    } catch (err) {
        console.error("❌ Error audio:", err);
        isPlaying = false;
    }
}

// 🔁 FIN DE AUDIO
player.on(AudioPlayerStatus.Idle, () => {
    isPlaying = false;
});

// ❌ ERRORES
player.on('error', (error) => {
    console.error("❌ Player error:", error);
    isPlaying = false;
    player.stop(true);
});
