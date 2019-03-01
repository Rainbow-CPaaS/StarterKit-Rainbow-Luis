const logger = require('./logger')(__filename);
const EventEmitter = require('events');
const Luis = require('./luis');
const OpenWeatherMap = require('./openweathermap');

class Bot {
    constructor ( luisOptions, owmOptions) {
        this.emitter = new EventEmitter();
        this.luis = new Luis(luisOptions);
        this.openWeather = new OpenWeatherMap(owmOptions);
    }

    sendIM (user, message) {
        this.emitter.emit('sendIM', {
            user: user,
            message: message
        });
    };

    async handleForecast( user, entities ){
        this.sendIM( user, `Searching the forecast in ${entities.location} for you`);

        try {
            const weatherResult = await this.openWeather.getForecastByCityName( entities.location );
            logger.debug( "forecast is %o ", weatherResult );
            weatherResult.forEach(  item => { this.sendIM( user, item ) } );
        } 
        catch( err ) {
            logger.error( `getForecastByCityName(${entities.location}) failed:`, err )
            this.sendIM( user, "an error was returned by openweather." );
        }
    }

    async handleWeather( user, entities ){
        //  WE REQUEST THE WEATHER
        this.sendIM( user, `Searching the current weather in ${entities.location} for you`);

        // request openWeather. Should be called back with a printable message
        // That we just have to send to IM                        
        try {
            const weatherResult = await this.openWeather.getWeatherByCityName( entities.location );
            this.sendIM( user, weatherResult );                           
        } 
        catch( err ) {
            logger.error( `getWeatherByCityName ${entities.location} failed:` ,err )
            this.sendIM( user, "an error was returned by openweather." );
        }
    }

    // Calls Luis on the message, 
    // and if the intent and entity back allow us to (expecting a location),
    // query openweather to ask for the weather in this location.
    async handleMessage( msg ) {
        const { message, user } = msg;

        if (!user || !message || !message.trim().length ) {
            return;
        }

        logger.debug('running handleMessage');

        try {            
            const response = await this.luis.handleMessage( message );

            // returns an object formatted like this: 
            // intent: 'intent'
            // entities: { location: ''}
            const intent = response.intent;
            const entities = response.entities;
            
            logger.debug("luis returned: intent: %o, entities: %o " , intent, entities );
        
            if( intent === 'None' ) {
                this.sendIM( user, "Sorry i didn't understand your request.\nYou can ask me about the weather in a location." );
            }
            else if( !entities.location ) {
                this.sendIM( user,"I don't know which location you want the weather for.");
            }                    
            else if( !entities.forecast ) {
                this.handleWeather( user, entities );
            } 
            else {
                this.handleForecast( user, entities );                
            }
        }
        catch( error ){
            logger.error( "Error returned by handlemessage %o", error)
            this.sendIM( user, "Sorry, I couldn't analyze your request." );
        }
    } 
}

module.exports = Bot;