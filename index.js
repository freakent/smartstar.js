var util = require('util');
var twitterAPI = require('ntwitter');
var mqtt = require('mqttjs');
var sugar = require('sugar');
var config = require('./config');
var cronJob = require('cron').CronJob;

var twitter = new twitterAPI(config.twitter);

var host = '192.168.0.12';
var port = '1883';
var topic = 'smartstar/in';

function when_connected_to_mqtt(client) {
  var date = new Date();
  if (date.getHours() >= 17 && date.getHours() < 23) {
      client.publish({topic: topic, payload: "ON"});
      util.log('Switch lights on');
  } else {
      client.publish({topic: topic, payload: "OFF"});
      util.log('Switch lights off');
  }

  new cronJob('00 00 17 * * *', function(){
  	  client.publish({topic: topic, payload: "ON"});
    	util.log('Switch lights on');
	}, null, true);

	new cronJob('00 30 22 * * *', function(){
  	  client.publish({topic: topic, payload: "OFF"});
    	util.log('Switch lights off');
	}, null, true);
	
	open_twitter_stream(client);
};

function connect_to_mqtt(connected_callback) {
  return mqtt.createClient(port, host, function(err, client) {

    if (err) process.exit(1);

    client.connect({keepalive: 15*60});

    client.on('connack', function(packet) {
      if (packet.returnCode === 0) {
        util.log('Connected to broker');
        connected_callback(client);
      } else {
        util.log('connack error %d', packet.returnCode);
        process.exit(-1);
      }
    });

    client.on('close', function() {
      util.log('Connection to broker closed: ' + client);
      process.exit(-1);
    });

    client.on('error', function(e) {
      util.log('error %s', e);
      process.exit(-1);
    });

  setInterval( function() { client.publish({topic: "ping", payload: "ping"})}, 10 * 60 * 1000);
  
  });
};

function open_twitter_stream(mqtt_client) {
  util.log("Opening twitter stream");
	twitter.stream('statuses/filter', {track:'cheerlights blue,cheerlights green,cheerlights purple, cheerlights'}, function(stream) {

		stream.on('data', function (data) {
			var pattern = data.text.toUpperCase().each(/\b(red|blue|green|purple)\b/i, function(color) {return color.first()}).join(""); 
			if (pattern.length > 0) {
				util.log(pattern + " - " + data.text);
				mqtt_client.publish({topic: topic, payload: "CHEER " + pattern});
			}
		});
	
//  setInterval(function(){console.log(stream)}, 30000);

		stream.on('end', function (response) {
			// Handle a disconnection
			util.log("Stream ended :" + response);
			open_twitter_stream(mqtt_client);
		});
	
		stream.on('destroy', function (response) {
			// Handle a 'silent' disconnection from Twitter, no end/error event fired
			util.log("Stream destroyed :" + response);
		});
	
	});
};


var mqtt_client = connect_to_mqtt(when_connected_to_mqtt);

