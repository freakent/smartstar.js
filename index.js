var twitterAPI = require('ntwitter');
var mqtt = require('mqttjs');
var sugar = require('sugar');
var config = require('./config');
var cronJob = require('cron').CronJob;

var twitter = new twitterAPI(config.twitter);

var host = '192.168.0.12';
var port = '1883';
var topic = 'smartstar/in';

var client = mqtt.createClient(port, host, function(err, client) {
  if (err) process.exit(1);
  client.connect({keepalive: 15*60});

  client.on('connack', function(packet) {
    if (packet.returnCode === 0) {
      console.log('Connected to broker');
    } else {
      console.log('connack error %d', packet.returnCode);
      process.exit(-1);
    }
  });

  client.on('close', function() {
    console.log('Connection to broker closed: ' + client);
    //process.exit(0);
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });

  setInterval(function(){client.publish({topic: "ping", payload: "ping"})}, 10 * 60 * 1000);
  
});

twitter.stream('statuses/filter', {track:'cheerlights blue,cheerlights green,cheerlights purple, cheerlights'}, function(stream) {

	stream.on('data', function (data) {
		var pattern = data.text.toUpperCase().each(/\b(red|blue|green|purple)\b/i, function(color) {return color.first()}).join(""); 
		if (pattern.length > 0) {
			d = new Date();
			console.log(d.getHours() + ":" + d.getMinutes() + " - " + pattern + " - " + data.text);
			client.publish({topic: topic, payload: "CHEER " + pattern});
		}
	});
	
//  setInterval(function(){console.log(stream)}, 30000);

	stream.on('end', function (response) {
		// Handle a disconnection
		console.log("Stream ended :" + response);
	});
	
	stream.on('destroy', function (response) {
		// Handle a 'silent' disconnection from Twitter, no end/error event fired
		console.log("Stream destroyed :" + response);
	});
	
});

//setInterval(function(){console.log(twitter)}, 30000);

new cronJob('00 30 19 * * *', function(){
    client.publish({topic: topic, payload: "ON"});
    console.log('Switch lights on');
}, null, true);

new cronJob('00 00 22 * * *', function(){
    client.publish({topic: topic, payload: "OFF"});
    console.log('Switch lights off');
}, null, true);

