var twitterAPI = require('ntwitter');
var mqtt = require('mqttjs');
var sugar = require('sugar');
var config = require('./config');

var twitter = new twitterAPI(config.twitter);

var host = 'localhost';
var port = '1883';
var topic = 'smartstar/in';

var client = mqtt.createClient(port, host, function(err, client) {
  if (err) process.exit(1);
  client.connect();

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
    process.exit(0);
  });

  client.on('error', function(e) {
    console.log('error %s', e);
    process.exit(-1);
  });
  
});

function processTwitterStream(client) {
	twitter.stream('statuses/filter', {track:'blue,green,purple'}, function(stream) {
	
		stream.on('data', function (data) {
			var cmd = 'CHEER ' + data.text.toUpperCase().each(/blue|green|purple/i); 
			if (cmd.length != 0) {
			  console.log(cmd);
			  client.publish({topic: topic, payload: cmd});
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