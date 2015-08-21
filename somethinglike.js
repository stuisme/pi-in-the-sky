var fs = require('fs');
var registration = '/pi-in-the-sky/registration.json';
var currentAsset;
var request = require('request');
var gpsd = require('node-gpsd');

function startLoop(){
  var daemon = new gpsd.Daemon({
    program: 'gpsd',
    device: '/dev/ttyAMA0',
    port: '2947',
    pid: '/tmp/gpsd.pid',
    logger: {
      info: function(){},
      warn: console.warn,
      error: console.error
    }
  });

  daemon.start(function(){
    console.log('daemon started');
    startListener();
  });

}

var startListener = function(){
  var lastSave = null;
  var listener = new gpsd.Listener({
    port: 2947,
    hostname: 'localhost',
    logger: {
      info: function(){},
      warn: console.warn,
      error: console.error
    },
    parse: true
  });

  listener.connect(function(){
    console.log('connected');
  });

  /* listener.disconnect(function(){
   console.log('disconnected');
   });*/

  var updateLocation = function(data){
    lastSave = new Date();

    console.log(data);

    var url = '/api/assets/' + currentAsset.id + '/locations';

    var postData = {
      latitude: data.lat,
      longitude: data.lon,
      created: (new Date()).toUTCString()
    };

    request({
      uri: 'http://dudewheresmypi.azurewebsites.net' + url,
      method: 'POST',
      body: postData,
      json: true,
      headers: {'Content-Type': 'application/json'}
    }, function (error, response, body) {

      if (error){
        console.log(error);
      }
      //console.log(body)
      if (!error && response.statusCode <= 300) {

//        console.log(response);
      } else {
        console.log(error);
      }
    })
  };

  listener.on('TPV', function(data){

    // if no fix yet, no need to send the information
    // 0 = not set, 1 = no fix
    // 2 = 2d, 3= 3d
    if (data.mode < 2){
      return;
    }

    if (!lastSave){
      updateLocation(data);
    }

    var twoMinutes = new Date(lastSave.getTime());

    twoMinutes.setMinutes(twoMinutes.getMinutes() + 1);

    if (new Date() > twoMinutes){
      updateLocation(data);
    }

  });

  listener.watch({class:'WATCH', json: true, nmea:false});
};

function registerDevice(cb){
  console.log('registering');
  request({
    uri: 'http://dudewheresmypi.azurewebsites.net/api/assets',
    method: 'POST',
    body: {name: (new Date()).toString()},
    json: true,
    headers: {'Content-Type': 'application/json'}
    }, function (error, response, body) {
      //console.log(body)
      if (!error && response.statusCode <= 300) {

        fs.writeFileSync(registration, JSON.stringify(body));
        currentAsset = body;
        return cb(body);
      }
  });
}

function init(){
  try {
    var data = fs.readFileSync(registration);
    var jsondata = JSON.parse(data);

    if(!jsondata.id){
      registerDevice(startLoop);
    } else{
      currentAsset = jsondata;
      startLoop();
    }
  } catch (ex){
    console.log('exception');
    registerDevice(startLoop);
  }
}

init();
