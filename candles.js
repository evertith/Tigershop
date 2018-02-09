// ****************************************************************************************
// *** VARIABLES **************************************************************************
// ****************************************************************************************
var stats = [];
var candles = [];
var candleCount = 0;
var currentCandle = 0;
var priceCount = 0;
var pricesPerCandle = 120;
var tradeData = {
    buyIn: {
        price: 0,
        trailingSell: 0,
        active: false,
        triggerPrice: 0
    },
    funds: 2000,
    eth: {
        funds: 0
    },
    btc: {
        funds: 0
    }
}

// ****************************************************************************************
// *** MODULES *******************************************************************************
// ****************************************************************************************

var express       = require('express');
var app           = express();
var server        = require('http').Server(app);
var request       = require('request');
var crypto        = require('crypto');
var key           = '3mLFsYRF4kEDWe5FsbqM';
var secret        = 'U78JC1BGCicyCnNkpjtqcAezK1d';
var sandboxKey    = 'Yl76EjiqicvIgQkllF0S';
var sandboxSecret = 'mrxt8iFjtskHbfaXuRCXVpG7PHG';

// ****************************************************************************************
// *** FUNCTIONS **************************************************************************
// ****************************************************************************************

function decideTrade(coin){
    console.log('deciding trade')
    if((candles[currentCandle].average > candles[currentCandle - 1].high) && !tradeData.buyIn.active){
        console.log('## BUY ##');
        try{
            var options = {
                method: 'get',
                uri: 'https://api.gemini.com/v1/pubticker/' + coin + 'usd',
            }

            options.headers = {
                'Accept': '*/*',
                'Accept-Language': 'en',
            }

            request(options, function(error, response, body) {
                if(response){
                    if(response.statusCode){
                        if (!error && response.statusCode == 200) {
                            var priceData = JSON.parse(body);

                            tradeData.buyIn.active = true;
                            tradeData.buyIn.price = priceData.last;
                            tradeData[coin].funds = tradeData.funds / priceData.last;
                            tradeData.funds = 0;
                        } else {
                            console.log('Response: ' + JSON.stringify(response))
                            console.log('Status code: ' + response.statusCode)
                            console.log('Error: ' + error)
                        }
                    }
                }
                setTimeout(function(){
                    buildCandle(coin);
                }, 1500)
            })
        } catch(er){
            console.log(er);
            setTimeout(function(){
                buildCandle(coin);
            }, 1500)
        }
    } else if((candles[currentCandle].high < candles[currentCandle - 1].average) && tradeData.active == true){
        console.log('## SELL ##');
        try{
            var options = {
                method: 'get',
                uri: 'https://api.gemini.com/v1/pubticker/' + coin + 'usd',
            }

            options.headers = {
                'Accept': '*/*',
                'Accept-Language': 'en',
            }

            request(options, function(error, response, body) {
                if(response){
                    if(response.statusCode){
                        if (!error && response.statusCode == 200) {
                            var priceData = JSON.parse(body);

                            tradeData.buyIn.active = false;
                            tradeData.buyIn.price = 0;
                            tradeData[coin].funds = 0;
                            tradeData.funds = (priceData.last * tradeData[coin].funds) - ((priceData.last * tradeData[coin].funds) * 0.005);
                        } else {
                            console.log('Response: ' + JSON.stringify(response))
                            console.log('Status code: ' + response.statusCode)
                            console.log('Error: ' + error)
                        }
                    }
                }
                setTimeout(function(){
                    buildCandle(coin);
                }, 1500)
            })
        } catch(er){
            console.log(er);
            setTimeout(function(){
                buildCandle(coin);
            }, 1500)
        }
    } else {
        console.log('no trade')
        setTimeout(function(){
            buildCandle(coin);
        }, 1500)
    }
}

function buildCandle(coin){
    var candleData;

    if(candles[currentCandle]){
        candleData = candles[currentCandle];
    } else {
        candleData = {
            id: currentCandle,
            high: 0,
            low: 0,
            average: 0,
            prices: []
        }
    }

    try{
        var options = {
            method: 'get',
            uri: 'https://api.gemini.com/v1/pubticker/' + coin + 'usd',
        }

        options.headers = {
            'Accept': '*/*',
            'Accept-Language': 'en',
        }

        request(options, function(error, response, body) {
            if(response){
                if(response.statusCode){
                    if (!error && response.statusCode == 200) {
                        process.stdout.write('\033c');

                        var priceData = JSON.parse(body);

                        candleData.prices.push(priceData.last);
                        
                        if((priceData.last > candleData.high) || candleData.high == 0){
                            candleData.high = priceData.last;
                        }
                        if((priceData.last < candleData.low) || candleData.low == 0){
                            candleData.low = priceData.last;
                        }

                        var totalPriceForAverage = 0;
                        candleData.prices.forEach(function(candlePrice){
                            totalPriceForAverage += parseFloat(candlePrice);
                        })
                        candleData.average = totalPriceForAverage / candleData.prices.length;

                        candles[currentCandle] = candleData;

                        stats = [];
                        stats.push('Price Count: ' + priceCount);
                        stats.push('Current Candle: ' + currentCandle);
                        stats.push('Current Candle High: ' + candleData.high);
                        stats.push('Current Candle Low: ' + candleData.low);
                        stats.push('Current Candle Average: ' + candleData.average);
                        stats.push('==================================');
                        stats.push('USD Funds: $' + tradeData.funds);
                        stats.push(coin + ' Funds: ' + tradeData[coin].funds + ' (USD Approx: $' + ((priceData.last * tradeData[coin].funds) - ((priceData.last * tradeData[coin].funds) * 0.005)) + ')');
                        stats.push('Price: $' + priceData.last);
                        stats.push('==================================\n');
                        if(tradeData.buyIn.active){
                            stats.push('Buy Price: $' + tradeData.buyIn.price);
                            stats.push('Profit Percentage: ' + (1 - (tradeData.buyIn.price / priceData.last)) + '%')
                            stats.push('==================================\n');
                        }

                        console.log(stats.join('\n'));

                        priceCount++;;

                        if(priceCount == pricesPerCandle){
                            if(candles.length > 2){
                                decideTrade(coin);
                                priceCount = 0;
                                currentCandle++;
                            } else {
                                priceCount = 0;
                                currentCandle++;
                                setTimeout(function(){
                                    buildCandle(coin);
                                }, 1500)
                            }
                        } else {
                            setTimeout(function(){
                                buildCandle(coin);
                            }, 1500)
                        }

                    } else {
                        console.log('Response: ' + JSON.stringify(response))
                        console.log('Status code: ' + response.statusCode)
                        console.log('Error: ' + error)
                    }
                }
            }
        })
    } catch(er){
        console.log(er);
    }
}

function startCandles(coin){
    // setInterval(function(){
    //     if(candles.length > 2){
    //         decideTrade(coin);
    //     }
    //     currentCandle++;
    //     buildCandle(coin);
    // }, 10000);

    buildCandle(coin);
}


// ****************************************************************************************
// *** START SERVER ***********************************************************************
// ****************************************************************************************

startCandles('btc');

app.get('/', function(req, res){
    res.send(stats.join('<br>'))
})

server.listen(4050);
