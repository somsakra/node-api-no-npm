//jshint esversion:6
/* helpers for various tasks

*/
const crypto = require('crypto');
const config = require('./config');

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

//Export the module
module.exports = helpers;
