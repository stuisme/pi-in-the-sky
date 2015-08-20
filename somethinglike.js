// function init(file.json, res){
//   fs.readFile('file.json', function (err, data) {
//       var jsondata = JSON.parse(data);
//       if(jsondata.id == nil){
//           var pidee = getPidee()
//           res.write(JSON.stringify(pidee));
//       }
//       res.end();
//   })
// }
var fs = require('fs');
var registration = 'registration.json';
var currentAsset;
var request = require('request');

function startLoop(){
  console.log(currentAsset);
}

function registerDevice(cb){
  console.log('registering');
  var asset = request({
    uri: 'http://localhost:62977/api/assets',
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
  })
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
