// Logger
const logger = require('./modules/logger')(__filename);

// Node-config
const config = require('config');

// Load the SDK
const RainbowSDK = require('rainbow-node-sdk');

const Bot = require( './modules/bot')

logger.info('Starting rainbow-luis-sample bot...');

// Get configuration options for Rainbow SDK, Microsoft Luis and OpenWeatherMap
const rainbowOptions = JSON.parse(JSON.stringify(config.get('rainbowOptions'))); // Make an extensible copy of config object
const luisOptions = config.get('luis');
const owmOptions = config.get('openweathermap');

// Instantiate the SDK
const rainbowSDK = new RainbowSDK(rainbowOptions);

// Start the BOT
const bot = new Bot(luisOptions, owmOptions);

// If the bot sends the sendIM event send it back to rainbow.
bot.emitter.on( 'sendIM',  param => {
    rainbowSDK.im.sendMessageToJid( param.message, param.user );    
})
 
// When an IM message is received, give it to the bot for him to handle it.
rainbowSDK.events.on('rainbow_onmessagereceived', message => {   
    if(message.type === "chat") {
        // Send to the bot
        bot.handleMessage({
            message: message.content, 
            user: message.fromJid
        });
        // Mark as read
        rainbowSDK.im.markMessageAsRead(message);
    }
});

rainbowSDK.start();

logger.info('Started.');