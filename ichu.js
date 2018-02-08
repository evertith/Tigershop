// ****************************************************************************************
// *** VARIABLES **************************************************************************
// ****************************************************************************************

var tickerData = {
    cycles: 0,
    eth: {
        price: 0,
        priceHistory: [],
    },
    btc: {
        price: 0,
        priceHistory: [],
        ichu: {
            tenkanSen: 0,
            kijunSen: 0,
            signal: ''
        }
    }
}

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

var stats = [];

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
    if(tickerData[coin].ichu.signal == 'buy'){
        if(!tradeData.buyIn.active){
            if(tradeData.buyIn.triggerPrice == 0){
                tradeData.buyIn.triggerPrice = tickerData[coin].price;
            } else {
                if((1 - (tradeData.buyIn.triggerPrice / tickerData[coin].price)) > 0.005){
                    console.log('Buy ' + coin + ' at ' + tickerData[coin].price)
                    tradeData.buyIn.price = tickerData[coin].price;
                    tradeData.buyIn.active = true;
                    tradeData[coin].funds = tradeData.funds / tradeData.buyIn.price;
                    tradeData.funds = 0;
                }
            }
        }
    } else if(tickerData[coin].ichu.signal == 'sell'){
        if(tradeData.buyIn.active){
            if((1 - (tradeData.buyIn.trailingSell / tickerData[coin].price)) < -0.005){
                console.log('Sell ' + coin + ' at ' + tickerData[coin].price)
                tradeData.buyIn.trailingSell = 0;
                tradeData.buyIn.price = 0
                tradeData.buyIn.active = false;
                tradeData.funds = (tickerData[coin].price * tradeData[coin].funds) - ((tickerData[coin].price * tradeData[coin].funds) * 0.005);
                tradeData[coin].funds = 0
            }
        }
        tradeData.buyIn.triggerPrice = 0;
    }
}

function buildIchu(coin){
    var lowestLowT = tickerData[coin].price;
    var highestHighT = tickerData[coin].price;
    var lowestLowK = tickerData[coin].price;
    var highestHighK = tickerData[coin].price;

    for(var i = 0; i < tickerData[coin].priceHistory.length; i++){
        if(i >= 18){
            if(tickerData[coin].priceHistory[i] < lowestLowT){
                lowestLowT = tickerData[coin].priceHistory[i];
            }
            if(tickerData[coin].priceHistory[i] > highestHighT){
                highestHighT = tickerData[coin].priceHistory[i];
            }
        }
        if(i >= 4){
            if(tickerData[coin].priceHistory[i] < lowestLowK){
                lowestLowK = tickerData[coin].priceHistory[i];
            }
            if(tickerData[coin].priceHistory[i] > highestHighK){
                highestHighK = tickerData[coin].priceHistory[i];
            }
        }
    }

    tickerData[coin].ichu.tenkanSen = (highestHighT + lowestLowT) / 2;
    tickerData[coin].ichu.kijunSen = (highestHighK + lowestLowK) / 2;

    if(tickerData[coin].ichu.tenkanSen > tickerData[coin].ichu.kijunSen){
        tickerData[coin].ichu.signal = 'buy';
    } else {
        tickerData[coin].ichu.signal = 'sell';
    }

    decideTrade(coin);

    tickerData.cycles++;

    process.stdout.write('\033c');

    stats = [];
    stats.push('Cycles: ' + tickerData.cycles);
    stats.push('==================================');
    stats.push('USD Funds: $' + tradeData.funds);
    stats.push(coin + ' Funds: ' + tradeData[coin].funds + ' (USD Approx: $' + ((tickerData[coin].price * tradeData[coin].funds) - ((tickerData[coin].price * tradeData[coin].funds) * 0.005)) + ')');
    stats.push('Price: $' + tickerData[coin].price);
    stats.push('Tenkan Sen: $' + tickerData[coin].ichu.tenkanSen);
    stats.push('Kijun Sen: $' + tickerData[coin].ichu.kijunSen);
    stats.push('==================================\n');
    if(tradeData.buyIn.active){
        stats.push('Buy Price: $' + tradeData.buyIn.price);
        stats.push('Profit Percentage: ' + (1 - (tradeData.buyIn.price / tickerData[coin].price)) + '%')
        stats.push('Trailing Sell: $' + tradeData.buyIn.trailingSell);
        stats.push('Trailing Sell Percentage: ' + (1 - (tradeData.buyIn.trailingSell / tickerData[coin].price)) + '%');
        stats.push('==================================\n');
    }

    console.log(stats.join('\n'))
}

function getPrice(coin){
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
                        //console.log(body);
                        tickerData[coin].price = parseFloat(JSON.parse(body).last);
                        tickerData[coin].priceHistory.push(tickerData[coin].price);
                        if(tickerData[coin].priceHistory.length == 27){
                            tickerData[coin].priceHistory.splice(0, 1);
                        }
                        if(tickerData[coin].price > tradeData.buyIn.trailingSell){
                            tradeData.buyIn.trailingSell = tickerData[coin].price;
                        }
                        buildIchu('btc');
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


// ****************************************************************************************
// *** START SERVER ***********************************************************************
// ****************************************************************************************

setInterval(function(){
    getPrice('btc');
}, 1500)

getPrice('btc');

app.get('/', function(req, res){
    res.send(stats.join('<br>'))
})

server.listen(4050);
