# watchmen-discord
This is a simple Discord bot that sends a message to a channel when a user joins, leaves or changes voice channels. It will read the messages from the messages.json file and send them to the channel.
## Prerequisites

    Node.js (version 14 or higher)
    Discord.js (version 13 or higher)
    TypeScript (version 4 or higher)

## Installation

- Clone this repository to your local machine.
- Install dependencies by running npm install.
- Add the following variables to the env:

```
BOT_TOKEN=<your-bot-token>
CHANNEL_ID=<channel-id-to-send-messages>
```

Replace <your-bot-token> with your Discord bot token and <channel-id-to-send-messages> with the ID of the channel where you want the bot to send messages.

## Usage

To start the bot, run npm start in your terminal. 
The bot will start and listen for user voice channel events.

## License

This project is licensed under the MIT License - see the LICENSE file for details.