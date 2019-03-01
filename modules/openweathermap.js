const logger = require('./logger')(__filename);
const axios = require('axios');

class  OpenWeatherMap {
    constructor (owmOptions) {
        this.units = (owmOptions.units === 'metric' || owmOptions.units === 'imperial') ? owmOptions.units : 'metric';
        this.apiWeatherUrl = `${owmOptions.API_URL}/weather`;
        this.apiForecastUrl = `${owmOptions.API_URL}/forecast`;
        this.API_Key = owmOptions.API_Key;
    }
    
    // Queries the weather in the city, 
    // If it works, returns a promise taking as a parameter the 
    // 'pretty-printed' message with the results.
    queryWeatherForCity( city ) {
        city = city || 'Paris';

        return axios.get(this.apiWeatherUrl, { 
            params: {
                q: city,
                APPID: this.API_Key,
                units: this.units
            } 
        });
    }

    // Queries the weather in the city, 
    // If it works, returns a promise taking as a parameter the 
    // 'pretty-printed' message with the results.
    async getWeatherByCityName (city) { 
        const response = await this.queryWeatherForCity( city );
        return this.weatherToMessage( response.data );        
    }

    queryForecastForCity (city) {
        city = city || 'Paris';
    
        return axios.get(this.apiForecastUrl, { 
            params: {
                q: city,
                APPID: this.API_Key,
                units: this.units,
                cnt: 20
            }
        })
    }

    // Queries the weather forecast in the city, 
    // If it works, returns a promise taking as a parameter the 
    // 'pretty-printed' message with the results.
    async getForecastByCityName (city) {
        const response = await this.queryForecastForCity( city );
        logger.debug( "openweather returned %o", response );
        return this.forecastToMessages( response.data );
    }

    setUnits( newUnits ) {
        this.units = (newUnits === 'metric' || newUnits === 'imperial') ? newUnits : this.units;            
        return this;
    }
    
    // returns the direction of the wind.
    windDirection( degrees, shortForm ) {
        
        if( degrees <= 22 || degrees >= 338 ) 
            return shortForm ?'N':'(north)';

        if( degrees <= 67 ) 
            return shortForm ?'NE':'(north-east)';
            
        if( degrees <= 112 ) 
            return shortForm ?'E':'(east)';

        if( degrees <= 157 )
            return shortForm ?'SE':'(south-east)';

        if( degrees <= 202 )
            return shortForm ?'S': '(south)';

        if( degrees <= 247 )
            return shortForm ?'SW': '(south-west)';

        if( degrees <= 292 )
            return shortForm ?'W': '(west)';

        return shortForm ?'NW': '(north-west)';
    }

    // returns an emoji decribing the current weather 
    // if it's the night, the 'sleeping' emoji and the time to wait for sunrise if considerNight is true
    emoji( data, considerNight ) {
        if (considerNight) {
            const now = (new Date().getTime() / 1000).toFixed(0);

            if (data.sys) {
                let timeToWaitForSun = 0;
                // before sunrise
                if (now < data.sys.sunrise) {
                    timeToWaitForSun = data.sys.sunrise - now
                }
                // after sunset
                else if (data.sys.sunset < now) {
                    timeToWaitForSun = (data.sys.sunrise + 24 * 3600) - now;
                }
                if (timeToWaitForSun > 60) {
                    return `:zzz:\n(sunrise in ${(timeToWaitForSun / 60).toFixed(0)} minutes)`;
                }
            }
        }

        // during the day
        if (data.rain || data.snow)
            return ':cloud_rain:';
        if (data.clouds.all <= 33)
            return ':sunny:';
        if (data.clouds.all <= 44)
            return ':white_sun_small_cloud:';
        if (data.clouds.all <= 55)
            return ':partly_sunny:';
        if (data.clouds.all <= 66)
            return ':white_sun_cloud:';
        if (data.clouds.all <= 66)
            return ':white_sun_rain_cloud:';
        return ':cloud:';
    }

    city( data ) {
        return `${data.name} (Lon: ${data.coord.lon.toFixed(2)}, Lat: ${data.coord.lat.toFixed(2)})`;
    }

    // translate openWeather reply into a printable string
    weatherToMessage( data ){
        const messages = [
            this.emoji(data, true),
            this.city(data),
            `Temperature: ${data.main.temp}°C ( ${data.main.temp_min.toFixed(0)}°C - ${data.main.temp_max.toFixed(0)}°C)`,
            `Weather: ${data.weather[0].description}`,
            data.clouds.all > 0 ? `Clouds: ${data.clouds.all}%` : null,
            data.wind ? `Wind: ${data.wind.speed.toFixed(0)} Km/h ${this.windDirection(data.wind.deg, false)}` : null,
            data.rain ? `Raining: (${data.rain["1h"].toFixed(0)} mm of rain last hour)` : null,
            data.snow ? `Snowing: (${data.snow["1h"].toFixed(0)} mm of snow last hour)` : null
        ]
        return messages.join('\n')
    }

    // translate openWeather forecast reply into a list of printable strings
    forecastToMessages( response ) {
        const splitSize = 8; // we group the forecast by groups of splitsize results
        const messages = [
            `City: ${this.city(response.city)}\n Here are the next ${response.list.length} weather forecasts:`
        ];
        const forecasts = response.list.map( data => {
            return [
                data.dt_txt + ": ",
                this.emoji(data, false),
                `${data.main.temp_min.toFixed(0)}/${data.main.temp_max.toFixed(0)}°C)`,
                `: ${data.weather[0].description}`,
                data.clouds.all > 0 ? `Clouds: ${data.clouds.all}%` : null,
                data.wind ? `Wind: ${data.wind.speed.toFixed(0)} Km/h ${this.windDirection(data.wind.deg, true)}` : null
            ].join(" ");
        });

        // now split the result in different messages
        let result = '';
        for (let i = 0; i < forecasts.length; i++) {
            result = result + forecasts[i];
            if ((i % splitSize) === (splitSize - 1) || (i === forecasts.length - 1)) {
                messages.push(result);
                result = '';
            }
            else {
                result = result + "\n"
            }
        }
        return messages;
    }
}

module.exports = OpenWeatherMap;