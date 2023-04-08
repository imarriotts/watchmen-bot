import { ChannelType, Client, GatewayIntentBits, GuildChannel, TextChannel, VoiceState } from 'discord.js';
import * as fs from "fs";

/**
 * @description The user class to store the user data
 */
class User {
    id: string;
    lastConnectedTime: Date;
    lastMessageSent?: Date;

    constructor(id: string, lastConnectedTime: Date, lastMessageSent?: Date) {
        this.id = id;
        this.lastConnectedTime = lastConnectedTime;
        this.lastMessageSent = lastMessageSent;
    }

    public canSendMessage(): boolean {
        const currentTime = new Date();
        if (!this.lastMessageSent) {
            return true;
        }
        // if the user has not sent a message in the last 1 minute
        const minutesAfterLastMessage = (currentTime.getTime() - this.lastMessageSent.getTime()) / 1000 / 60;
        if (minutesAfterLastMessage >= 1) {
            return true;
        }
        return false;
    }
}

enum MessageTypes {
    MESSAGE_CONNECT = "MESSAGE_CONNECT",
    MESSAGE_ENTERED = "MESSAGE_ENTERED",
    MESSAGE_DISCONNECT = "MESSAGE_DISCONNECT",
    MESSAGE_CHANGE = "MESSAGE_CHANGE",
    MESSAGE_ENTERED_ERR = "MESSAGE_ENTERED_ERR",
    MESSAGE_DISCONNECT_ERR = "MESSAGE_DISCONNECT_ERR",
    MESSAGE_CHANGE_ERR = "MESSAGE_CHANGE_ERR",
    DEFAULT = "DEFAULT"
}

/**
 * @description The users class to store all the users
 */
class Users {
    private static instance: Users;
    private users: Map<string, User> = new Map();
    private messages: Map<MessageTypes, string[]> = new Map();

    private constructor() {
        this.loadUsers();
        this.loadMessages();
    }

    public static getInstance(): Users {
        if (!Users.instance) {
            Users.instance = new Users();
        }

        return Users.instance;
    }

    public getUsers() {
        return Array.from(this.users.values());
    }

    public saveUsers() {
        const data = JSON.stringify(Array.from(this.users.values()));
        // write the user.json file relative to the current file
        const path = __dirname + "/users.json";
        fs.writeFileSync(path, data);
    }

    public findUser(id?: string) {
        if (!id) return null;
        const user = this.users.get(id);
        if (!user) {
            const newUser = new User(id, new Date());
            this.users.set(id, newUser);
            this.saveUsers();
            return newUser;
        }
        return user

    }
    public loadUsers() {
        try {
            const path = __dirname + "/users.json";
            const data = fs.readFileSync(path);
            const users = JSON.parse(data.toString());

            users.forEach((user: any) => {
                this.users.set(
                    user.id,
                    new User(user.id, new Date(user.lastConnectedTime), new Date(user.lastMessageSent))
                );
            });
        } catch (err: any) {
            if (err.code === "ENOENT") {
                fs.writeFileSync("users.json", "[]");
            } else {
                console.error(err);
            }
        }
    }

    public updateLastMessageSent(id: string) {
        const user = this.findUser(id);
        if (user) {
            user.lastMessageSent = new Date();
            this.saveUsers();
        }
    }

    public loadMessages() {
        const path = __dirname + "/messages.json";
        const data = fs.readFileSync(path);
        const messages = JSON.parse(data.toString());
        Object.keys(messages).forEach((key) => {
            if (Object.values(MessageTypes).includes(key as MessageTypes)) {
                this.messages.set(key as MessageTypes, messages[key]);
            }
        });
    }

    public getRandomMessage(type: MessageTypes, username?: string): string {
        const messageUsername = username ?? "";
        const messages = this.messages.get(type);
        if (!messages || messages.length === 0) {
            return "";
        }
        const message = messages[Math.floor(Math.random() * messages.length)];
        return message.replace("{username}", messageUsername);
    }
}

// Create the users instance
const users = Users.getInstance();

// Get the environment variables
const BOT_TOKEN = process.env.BOT_TOKEN!;
const CHANNEL_ID = process.env.CHANNEL_ID!;

if (!BOT_TOKEN || !CHANNEL_ID) {
    throw new Error("Missing environment variables");
}

/**
 * a function to send a message to a channel
 * @param message 
 * @param channel 
 */
function sendMessage(message: string, channel?: TextChannel | null) {
    const channels = client.channels.cache;
    const textChannel = channel ?? channels.get(CHANNEL_ID) as TextChannel;
    if (!textChannel) {
        throw new Error("Channel not found");
    }
    textChannel.send(message).then(sentMessage => {
        setTimeout(() => {
            sentMessage.delete();
        }, 1 * 60 * 1000);
    });
}

/**
 * A function to determine the message key
 * @param userShouldSendMessage 
 * @param userChangedChannel 
 * @param userDisconnectedFromChannel 
 * @param userConnectedToChannel 
 * @returns 
 */
function determineMessageKey(userShouldSendMessage: boolean, userChangedChannel: boolean, userDisconnectedFromChannel: boolean, userConnectedToChannel: boolean) {
    if (userShouldSendMessage) {
        if (userConnectedToChannel) return MessageTypes.MESSAGE_ENTERED;
        if (userDisconnectedFromChannel) return MessageTypes.MESSAGE_DISCONNECT;
        if (userChangedChannel) return MessageTypes.MESSAGE_CHANGE;
    }
    if (userConnectedToChannel) return MessageTypes.MESSAGE_ENTERED_ERR;
    if (userDisconnectedFromChannel) return MessageTypes.MESSAGE_DISCONNECT_ERR;
    if (userChangedChannel) return MessageTypes.MESSAGE_CHANGE_ERR;
    return MessageTypes.DEFAULT;
}

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
]

const client = new Client(
    {
        intents,
    });

client.on('ready', () => {
    console.log('I\'m in');
    const message = users.getRandomMessage(MessageTypes.MESSAGE_CONNECT);
    sendMessage(message);
});

client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
    const voiceUser = newState.member;
    const { id, displayName: userName } = voiceUser ?? {};
    const user = users.findUser(id);
    if (!user) return;
    const newChannelId = newState.channelId;
    const oldChannelId = oldState.channelId;

    if (newChannelId === oldChannelId) return;

    const allChannels = client.channels.cache.values();
    const allVoiceChannels = Array.from(allChannels).filter((o) => o.type === ChannelType.GuildVoice).map((p) => {
        const { id, name } = p as GuildChannel;
        return { id, name }
    });

    const channelIsAVoiceChannel = allVoiceChannels.find((o) => o.id === newChannelId || o.id === oldChannelId) !== undefined;

    // checks
    const userConnectedToChannel = channelIsAVoiceChannel && !oldChannelId
    const userDisconnectedFromChannel = channelIsAVoiceChannel && !newChannelId
    const userChangedChannel = channelIsAVoiceChannel && oldChannelId !== undefined && newChannelId !== undefined
    const userShouldSendMessage = user.canSendMessage()

    const messageKey = determineMessageKey(userShouldSendMessage, userChangedChannel, userDisconnectedFromChannel, userConnectedToChannel);

    const message = users.getRandomMessage(messageKey, userName);

    sendMessage(message);
    users.updateLastMessageSent(user.id)
});

client.login(BOT_TOKEN);