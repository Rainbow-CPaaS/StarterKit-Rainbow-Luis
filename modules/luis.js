const logger = require('./logger')(__filename);

const axios = require('axios');

// The user does not need to instanciate himself
class Luis {
    constructor( luisOptions ) {
        let endpoint = luisOptions.ENDPOINT;
    
        // remove the &q= from the query string if present
        if (endpoint.endsWith("&q=")) {
            endpoint = endpoint.slice(0, -3);
        }
        this.luisOptions = { ...luisOptions, ENDPOINT: endpoint };
    }

    queryLuis( message ) {
        if ( message ) {           
            return axios.get(this.luisOptions.ENDPOINT, { params: { q: message }});
        }
        throw ( 'need a message to send to Luis' );
    };

    // given a message, calls luis and returns a promess 
    // that will call the method with an object containing:
    // in intent: the topScoringIntent
    // in entities: the entities found (searches for a location and possibly a date )
    async handleMessage( message ) {

        if ( !message || !message.trim().length  ) 
             return;

        const response = await this.queryLuis(message);
        // We received a response from luis:
        // extract from the response the fields entities and intent, and return a promise 
        // that resolves those parameters                        
                
        const intent = response.data.topScoringIntent ? response.data.topScoringIntent.intent : ""
        let entities = {}

        if( response.data.entities ) {
            // Search location and date in the entities returned from luis
            // and store them in an object { date:..., location:...}                                
            entities =  response.data.entities
                .reduce(  ( res, obj ) => {
                    if(obj.type.startsWith( "builtin.datetimeV2.") ) {
                        res.date = obj.resolution.values[0].value;
                        res.forecast = true;
                        return res;
                    }
                    if( obj.type == "timex") {
                        res.forecast = true;
                        return res;
                    }
                     if( obj.type == "builtin.geographyV2.city" ) {
                        res.location = obj.entity;
                        return res;
                     }

                    return res;
                }, {});

        }
        return  { intent: intent , entities: entities, response: JSON.stringify(response.data) };
                
    }
}

module.exports = Luis;