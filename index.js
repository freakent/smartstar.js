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
  client.connect({keepalive: 60*30});

  client.on('connack', function(packet) {
    if (packet.returnCode === 0) {
		processTwitterStream(client);
    } else {
      console.log('connack error %d', packet.returnCode);
      process.exit(-1);
    }
  });

  client.on('close', function() {
    console.log('Connection to broker closed');
    //process.exit(0);
    client.connect({keepalive: 60*30});
    console.log('Reconnected to broker');
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });
  
});

function processTwitterStream(client) {
	twitter.stream('statuses/filter', {track:'cheerlights blue,cheerlights green,cheerlights purple'}, function(stream) {
	
		stream.on('data', function (data) {
			var pattern = data.text.toUpperCase().each(/blue|green|purple/i, function(color) {return color.first()}).join(""); 
			if (pattern.length > 0) {
			  console.log(pattern);
			  client.publish({topic: topic, payload: "CHEER " + pattern});
			}
		});
		
		stream.on('end', function (response) {
			// Handle a disconnection
			client.disconnect();
			console.log("Stream ended");
		});
		
		stream.on('destroy', function (response) {
			// Handle a 'silent' disconnection from Twitter, no end/error event fired
			client.disconnect();
			console.log("Stream destroyed");
		});
		
	});
};

new cronJob('00 30 19 * * *', function(){
    client.publish({topic: topic, payload: "ON"});
    console.log('Switch lights on');
}, null, true);

new cronJob('00 00 22 * * *', function(){
    client.publish({topic: topic, payload: "OFF"});
    console.log('Switch lights off');
}, null, true);
