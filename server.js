var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor

var sp = new SerialPort("/dev/cu.usbmodem1421", {
  parser: serialport.parsers.readline("\n")
});

sp.on("open", function () {
  console.log('open');
  sp.on('data', function(data) {
  	try{
	  	var json = JSON.parse(data);
	  	var fTemp = json.temperature * 9/5 + 32;
	  	console.log('TEMP: ' + fTemp);
	  } catch(er){
	  	console.log(data);
	  }
  });

  setInterval(function(){
	  sp.write('{"pin": 8, "value": 0}', function(err, results) {
	    console.log('err ' + err);
	    console.log('results ' + results);
	  });
  }, 3000)
});