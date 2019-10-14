//jshint esversion:6
/* helpers for various tasks

*/
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

var helpers = {};

//Create a SHA256 hash

helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    let hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
    return hash;
  }else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str) {
  try {
    var obj = JSON.parse(str);
    return obj;
  }catch(e) {
    return {};
  }
};

//Create a String of random alphanumeric characters, fo a given length

helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength: false;
  if(strLength){
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var str = '';
    for(i = 1; i <= strLength; i++){
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random()*possibleCharacters.length));
      str+=randomCharacter;
    }
    return str;

  }else {
    return false;
  }
};

helpers.sendTwilioSms = function(phone,msg,callback){
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim(): false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg) {
    //config the request payload
    var payload = {
      'From': config.twilio.fromPhone,
      'To': '+6'+phone,
      'Body': msg
    };
    //Stringify the payload
    var stringPayload = querystring.stringify(payload);
    //Config the request details
    var requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth': config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    var req = https.request(requestDetails,function(res){
      //Grab the status of the send request
      let status = res.statusCode;
      // Callback successfully if the request went through
      if(status == 200 || status ==201){
        callback(false);
      }else {
        callback('Status code returned was '+status);
      }
    });

//Bind to the error event so it doesn't get thrown
req.on('error',function(e){
  callback(e);
});
//Add the payload
req.write(stringPayload);
//End the request
req.end();

  }else {
    callback ("Given parameters were missing or invalid");
  }

};

//Export the module
module.exports = helpers;
