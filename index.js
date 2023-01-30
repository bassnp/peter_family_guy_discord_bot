/*
    not.bass#3945
    1/30/2023
*/

const CONFIG = require('./config.json');
const TOKEN = CONFIG.bot_private_token
const CHANNEL_NAME = CONFIG.music_channel

var curr_channel = undefined

const { Client, GuildMember, IntentsBitField, EmbedBuilder } = require("discord.js")
const { Player, QueryType } = require("discord-player")

function log(str) {
    console.log(str)
}

// Clean chat, happy chat
async function delete_messages() {
    await curr_channel.messages.fetch()
        .then(messages => {
            messages.forEach(async (msg) => {
                if (msg != undefined && msg.deletable) {
                    await msg.delete()
                        .then(() => log(`Deleted msg`))
                        .catch(console.error)
                    await new Promise(r => setTimeout(r, 1000))
                }
            })
            log(`- ${CHANNEL_NAME} cleared`)
        })
        .catch(console.error) 
}

// thx - https://discordjs.guide/popular-topics/embeds.html#embed-preview
function embed_send(msg, options) { //title, value, track, title2, value2) { 
    log(`Sending embed for: ${options.value} ${msg.author ? msg.author.username : (msg.user ? msg.user.username : (" "))}`)
   
    const embed = new EmbedBuilder()
	.setColor(0x31DE56)
	.addFields({ 
        name: options.title, 
        value: options.value,
        inline: true,
    })
    
    if (options.track !== undefined) 
        embed // Extra feilds
            .setThumbnail(options.track.thumbnail)
            .setTitle(options.track.url)
	        .setURL(options.track.url)
            .setFooter({ text: `Duration: ${options.track.duration}` })
            .setTimestamp()
            .addFields({ 
                name: "Authored by:", 
                value: options.track.author,
                inline: true,
            })
            //.setAuthor({ name: options.track.url, url: options.track.url })
        

    if (options.title2 !== undefined && value2 !== undefined) 
        embed.addFields({ 
            name: options.title2, 
            value: options.value2,
        })

    return msg.token ? msg.reply({embeds: [embed]}) : msg.send({embeds: [embed]})
}

// Play helper func
async function play(queue, msg, song, search_type, force_skip, shuffle) {
    if (!queue.connection) 
        await queue.connect(msg.member.voice.channel)

    const is_playlist = song.includes(".com/playlist")
    var query_type = undefined

    if (is_playlist) {
        log("Playing playlist")
        if (song.includes("youtube.com/playlist")) 
            query_type = QueryType.YOUTUBE_PLAYLIST
        else if (song.includes("spotify.com/playlist"))
            query_type = QueryType.SPOTIFY_PLAYLIST
        else 
            query_type = QueryType.AUTO
    }
    else { 
        log("Playing single")
        query_type = search_type === undefined ? QueryType.AUTO : search_type
    }

    // Query
    const result = await client.player.search(is_playlist ? song : song + " audio", {
        requestedBy: msg.user,
        searchEngine: query_type,
    })

    // Extra params.
    if (force_skip) {
        if (is_playlist) {
            queue.clear()
            await queue.addTracks(result.tracks)
        } else
            await queue.addTrack(result.tracks[0])

        queue.skip()
    } else {
        await is_playlist ? queue.addTracks(result.tracks) : queue.addTrack(result.tracks[0])
    }

    if (shuffle) 
        queue.shuffle()

    // Play it
    if (!queue.playing)
        await queue.play()

    if (result.tracks.length === 0) {
        return embed_send(msg, {
            title: `Song could not be added`,
            value: `0 results for "${song}"`
        })
    } 
}

// More flags == more smarts
const client = new Client({
    intents: [ 
        IntentsBitField.Flags.Guilds, 
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
})

client.player = new Player(client, {
    ytdlOptions: {
        quality: "highestaudio",
        highWaterMark: 1 << 25
    }
})

// Boring player callbacks
client.player.on("error", async (queue, error) => {
    log(`\nError emitted from the queue: ${error.message}`)
})
client.player.on("connectionError", async (queue, error) => {
    log(`\nError emitted from the connection: ${error.message}`)
})
client.player.on("trackStart", async (queue, track) => {
    log(`\nNow playing: ${track.title}`)
    await delete_messages()

    embed_send(curr_channel, {
        title: `Now playing:`, 
        value: `${track.title}`, 
        track: track
    })
})
client.player.on("trackAdd", async (queue, track) => {
    log(`\nAdding: ${track.title}`)
    await delete_messages()
    if (!track.url.includes(".com/playlist")) { 
        embed_send(curr_channel, {
            title: `\nAdded to the queue:`, 
            value: `${track.title}`, 
            track: track
        })  
    }
})
client.player.on("botDisconnect", async (queue) => {
    log(`\nDisconnected`)
    await delete_messages()
})
client.player.on("queueEnd", async (queue) => {
    log(`\nQueue ended`)
    await delete_messages()
})

// For the memes, also all real games on Steam btw
const game_library = [
    "Futa Paradise", "Futa Spell", "Latex Tentacles", "Furry Sweeper", "EdgeLords",
    "Futapunk 2069", "Juicy Futa", "OctoFurry", "Futanari Quest", "Furry Feet",
    "Hentai Crush", "Hentai Dojo", "Hentai Weed PuZZles", "Succubus Farm", "Desktop Girlfriend",
    "Hot Tub Simulator", "Kidnapped Girl", "Sexy Sniper", "HOT GIRLS VR", "Anime Girls VR",
    "Girls Dance VR", "Virtual Reality Girls", "Grand Strokers", "Seduction 誘惑", "Femboy Bangers 2",
    "Furry Hentai Quest", "Femboys & Fries", "Furry Feet - Femboys!", "My Stepbro is a Femboy", "Grand Theft Auto V",
    "Arma 3", "7 Days to Die", " Bloons TD 6", "CS:GO", "Destiny 2"
]

const commands = [
    {
        name: "play",
        description: "Plays a song",
        options: [{
            name: "query",
            type: 3,
            description: "The song name or a direct link to the song",
            required: true
        }],
    },
    {
        name: "skip",
        description: "Skips the current song",
    },
    {
        name: "queue",
        description: "Shows the queue of songs",
    },
    {
        name: "shuffle",
        description: "Shuffles the queue of songs",
    },
    {
        name: "disconnect",
        description: "Stops the song and disconnects the bot",
    },
    {
        name: "80",
        description: "Plays Jake Gaskin's 80's playlist.",
    },
]

client.on("ready", async () => {
    log(`\n${client.user.tag} is now online and ready :D\n`)
    client.user.setPresence({ status: "dnd", })

    // Setup commands
    const guilds = client.guilds.cache.map(guild => guild.id)
    log(guilds)

    for(var i = 0; i < guilds.length; i++) {
        const guild = client.guilds.cache.get(guilds[i])
        await guild.commands.set(commands)
            .catch(console.error)

        log(`- Clearing "${CHANNEL_NAME}" in "${guild.name}"`)

        const music_channel = guild.channels.cache.find(
            channel => channel.name.toLowerCase() === CHANNEL_NAME
        )

        await music_channel.messages.fetch()
            .then(messages => {
                messages.forEach(async (msg) => {
                    if (msg != undefined && msg.deletable) {
                        await msg.delete()
                            .then(() => log(`Deleted msg`))
                            .catch(console.error)
                        await new Promise(r => setTimeout(r, 1000))
                    }
                })
                log(`- "${CHANNEL_NAME}" cleared`)
            })
            .catch(console.error) 
    }

    // Do meme
    while(true) {
        client.user.setActivity(` ${game_library[Math.floor(Math.random() * game_library.length)]}`)
        await new Promise(r => setTimeout(r, 150000))
    }
})

// Cleanliness in the text channel
client.on("messageCreate", async (msg) => {
    // Ignore self
    if (msg.author.username == client.user.username)
        return

    if(msg.channel.name != CHANNEL_NAME)
        return

    if (msg != undefined && msg.deletable)
        await msg.delete()
            .then(() => log(`Deleted stupid msg`))
            .catch(console.error)
})

// Command read
client.on("interactionCreate", async (interaction) => {
    // Valid user
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel)
        return

    // Setup
    curr_channel = interaction.channel
    if(curr_channel.name != CHANNEL_NAME)
        return await embed_send(interaction,{ 
            title: "Wrong channel", 
            value: `Go to the ${CHANNEL_NAME}`,
        })

    log(`Found command in #${curr_channel.name} from "${interaction.user.username}"`)
    const queue = await client.player.createQueue(interaction.guild)

    switch (interaction.commandName) {
        /* Plays a song  */
        case "play": 
            const token = interaction.options.get("query").value.trim()
            if (token.length > 2) {
                play(queue, interaction, token, QueryType.AUTO, false, false)
                return await embed_send(interaction,{ 
                    title: "Searching for:", 
                    value: token,
                })
            }
            else if(token.length <= 2) 
                return await embed_send(interaction, {
                    title: "Nopeity nope", 
                    value: `Invalid query input, not long enough`,
                })
            else 
                return await embed_send(interaction, {
                    title: "Ur dumb as shit", 
                    value: `Invalid query input`,
            })

        /* Skips the current song  */
        case "skip": 
            // Check playing before skip
            if (queue.playing) {
                // Cache title
                const song = queue.nowPlaying()
                // Cont.
                await queue.skip()
                return await embed_send(interaction,{ 
                    title: `Removed:`, 
                    value: `${song.title}`, 
                    track: song,
                })
            }
            else
            return await embed_send(interaction, {
                title: "Ur dumb as shit", 
                value: `No songs are currently playing idiot`,
            })

        /* Shows the queue of songs */
        case "queue":
            // Send breif info about the queue
            return await embed_send(interaction,{ 
                track: (queue.playing ? queue.nowPlaying() : undefined),

                title: `Now playing:`, 
                    value: (queue.playing ? `${queue.nowPlaying().title}` : "No songs are currently playing"), 

                title2: `Queue:`, 
                    value2: `There ${queue.tracks.length == 1 ? `is 1 more song` : `${queue.tracks.length} more songs`} in the queue`,
            })

        /* Shuffles the queue of songs */
        case "shuffle":
            // Making sure the queue can be shuffled
            if (queue.tracks.length > 1) {
                await queue.shuffle()
                return await embed_send(interaction, {
                    title: `Doodoofart`, 
                    value: `Juggled the queue like how your two dads juggles my balls`,
                })
            }
            else
                return await embed_send(interaction, {
                    title: `Fartdoodoo`, 
                    value: `Not enough songs in the queue to be able to shuffel em`,
                })

        /* Stops the song and disconnects the bot */
        case "disconnect":
            await queue.destroy(true)
            await embed_send(interaction, {
                title: `Leaving, cya :wave:`, 
                value: `......`,
            })
            return await delete_messages()

        /* Plays Jake Gaskin's 80's playlist. */
        case "80":
            play(queue, interaction, "https://open.spotify.com/playlist/6h7i6tyP3oAevKCQXB2iXz?si=ee70df58433542bf", QueryType.SPOTIFY_PLAYLIST, false, true)
            await embed_send(interaction,{ 
                title: "Short btw", 
                value: "Conner is a little fucking gremlin",
            })
            return queue.shuffle()
        default: break
    }
})

// Begin
client.login(TOKEN)