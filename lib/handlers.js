//jshint esversion:6

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

var handlers = {};
//sample handler
handlers.sample = function(data, callback){
  //Callback a http status code, and a payload object
  callback(406,{'name' : "sample handler"});
};
handlers.ping = function(data, callback){
  callback(200);
};
handlers.hello = function(data, callback){
  callback(200, {"message" : "Welcome message"});
};
handlers.users = function(data, callback){
  let acceptableMethodes = ['post', 'get', 'put', 'delete'];
  if(acceptableMethodes.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  }else{
    callback(405);
  }
};

//container for the users submethods
handlers._users = {};

//Users - past
//Require data: firstname, lastname, phone, password, tosAgreement
//Optional data: none
handlers._users.post = function(data,callback){
  //Check that all required fieds are filled out
  let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement){
    //Make sure that the user doesnt already exist
    _data.read('users', phone, function(err,data){
      if (err){
        //Has the password
        let hashedPassword = helpers.hash(password);

        // Create the user queryStringObject
        if(hashedPassword){
          let userObject = {
            firstname: firstName,
            lastname: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          };

          //Store the user
          _data.create('users', phone, userObject, function(err){
            if(!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500,{Error: "Could not create the new user"});
            }
          });
        } else {
        callback(500,{Error: 'Could not hashed the user\'s password'});
        }


      }else {
        // User already exists
        callback(400,{Error: 'A user with that phone number already exists'});
      }

    });
  } else {
    callback(400,{'Error': 'Missing required fields'});
  }
};
//Users - get
//Require data: phone
//Optional data: none

handlers._users.get = function(data,callback){
let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
if(phone) {
  //Get the token from the headers
  let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
  //Verify that the given token is valid for the phone number
  handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
    if(tokenIsValid){
      _data.read('users', phone, function(err,data){
        if(!err && data){
          //Remove the hashed password before return to the requester
          delete data.hashedPassword;
          callback(200,data);
        } else {
          callback(404);
        }
      });
    } else {
      callback(403,{'Error' : 'Missing required token in header of invalid'});
    }
  });

}else {
  calback(400,{'Error' : 'Missing requred field'});
}
};
//Users - put
//Require data: phone
//Optional data: firstName, lastName, password (at lease one must be specified)
handlers._users.put = function(data,callback){
//check the required field
let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

//check the optional fields
let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

//Error if the phone is invalid
if(phone){
  //Error if nothing is sent to Update
  if(firstName || lastName || password){
    let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Look up the user
        _data.read('users', phone, function(err,userData){
          if(!err && userData){
            //Update the fields necessary
            if(firstName){
              userData.firstname = firstName;
            }
            if(lastName){
              userData.lastName = lastName;
            }
            if(password){
              userData.hashedPassword = helpers.hash(password);
            }
            // Store the new updates
            _data.update('users', phone, userData, function(err){
              if(!err){
                callback(200);
              }else {
                console.log(err);
                callback(500,{'Error': 'Could not update the user'});
              }
            });
          } else {
            callback(400, {'Error': 'User does not exist'});
          }
        });
      } else {
        callback(403,{'Error' : 'Missing required token in header of invalid'});
      }
    });

  } else {
    callback(400,{'Error': 'Missing fields to update'});
  }

} else {
  callback(400,{'Error': 'Missing required field'});
}


};
//User - delete
//Require data: phone
//Optional data: none
handlers._users.delete = function(data,callback){
// Check that the phone number is valid
let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
if(phone) {

  let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
  handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
    if(tokenIsValid){
      _data.read('users', phone, function(err,userData){
        if(!err && userData){
          _data.delete('users', phone, function(err){
            if(!err){
            // Delete each of the check associated with the user
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];
            var checksToDelete = userChecks.length;
            if(checksToDelete > 0){
              var checksDeleted = 0;
              var deleteionErrors = false;
              // Loop through the checks
              userChecks.forEach(function(checkId){
                // Delete the check
                _data.delete('checks',checkId,function(err){
                  if(err){
                    deleteionErrors = true;
                  } else {
                    checksDeleted++;
                    if(checksDeleted == checksToDelete){
                      if(!deleteionErrors){
                        callback(200);
                      } else {
                        callback(500,{Error : "Error encountered while attempting to delete all of the user checks"});
                      }
                    }
                  }
                });
              });
            }else {
              callback(200);
            }

            } else {
              callback(500,{'Error': 'Could not delete the user'});
            }
          });
        } else {
          callback(404,{'Error': 'Could not find the user'});
        }
      });

    } else {
      callback(403,{'Error' : 'Missing required token in header of invalid'});
    }
  });

}else {
  calback(400,{'Error' : 'Missing requred field'});
}
};

// Tokens
handlers.tokens = function(data, callback){
  let acceptableMethodes = ['post', 'get', 'put', 'delete'];
  if(acceptableMethodes.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
  }else{
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

//Tokens - post
//Require data: phone, password
//Optional data: none
handlers._tokens.post = function(data,callback){
  let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password) {
    //Look up the user who matches that phone number
    _data.read('users',phone,function(err,userData){
      if(!err && userData){
        // Hash the send password, and compare it to the password store in userObject
        var hashedPassword = helpers.hash(password);
        if(hashedPassword == userData.hashedPassword){
          // if valid, create a new token with a random name, set expiration date 1 hour
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };
          _data.create('tokens', tokenId, tokenObject,function(err){
            if(!err){
              callback(200,tokenObject);
            } else {
              callback(500,{'Error': 'Could not create the new token'});
            }
          });

        } else {
          callback(400,{'Error': 'Password did not match the specified user\'s stored password'});
        }
      }else {
        callback(400,{'Error': 'Could not find the specified user'});
      }
    });
  }else {
    callback(400,{'Error': 'Missing required field(s)'});
  }

};
//Tokens - get
//Require Data : id
//Option data : none
handlers._tokens.get = function(data,callback){
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    _data.read('tokens', id, function(err,tokenData){
      if(!err && tokenData){
        delete data.hashedPassword;
        callback(200,tokenData);
      } else {
        callback(404);
      }
    });
  }else {
    callback(400,{'Error' : 'Missing requred field'});
  }
};
//Token - put
//Require data : id, extend
// Optional data : none
handlers._tokens.put = function(data,callback){
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if (id && extend){
    _data.read('tokens', id,function(err,tokenData){
      if(!err && tokenData){
        //Check to the make sure the token isn't already expired
        if(tokenData.expires > Date.now()){
          tokenData.expires = Date.now() + 1000*60*60;
          //Store the new updates

          _data.update('tokens', id, tokenData,function(err){
            if(!err){
              callback(200);
            }else {
              callback(500,{'Error': 'Could not update the token\'s expiration'});
            }
          });

        } else {
          callback(400, {'Error' : 'The token has already expired, cannot extended'});
        }
      }else {
        callback(400,{'Error':'Specified token does not exist'});
      }
    });
  }else {
    callback(400,{'Error': 'Missing required field(s) or invalid'});
  }

};

//Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){
  let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    _data.read('tokens', id, function(err,data){
      if(!err && data){
        _data.delete('tokens', id, function(err,data){
          if(!err){
            callback(200);
          } else {
            callback(500,{'Error': 'Could not delete the token'});
          }
        });
      } else {
        callback(404,{'Error': 'Could not find the token'});
      }
    });
  }else {
    calback(400,{'Error' : 'Missing requred field'});
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
  //look up the tokens
  _data.read('tokens',id,function(err,tokenData){
    if(!err && tokenData){
      // Check that the token is for the given user and has not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      }else {
        callback(false);
      }
    }else {
      callback(false);
    }
  });
};

//Checks
handlers.checks = function(data, callback){
  let acceptableMethodes = ['post', 'get', 'put', 'delete'];
  if(acceptableMethodes.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  }else{
    callback(405);
  }
};

//Container for all the checks methods
handlers._checks = {};

//Checks - post
//Required data: protocol, url, method, successCodes, timeoutSeconds
//Optiondata : none

handlers._checks.post = function(data,callback){
  //validate inputs
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5  ? data.payload.timeoutSeconds : false;

  if ( protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // lookup the user by reading the token
    _data.read('tokens',token,function(err,tokenData){
      if(!err && tokenData) {
        var userPhone = tokenData.phone;
        //lookup the user data
        _data.read('users', userPhone,function(err,userData){
          if (!err && userData) {
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];
            //verify that the user has less than the number of max-checks-per-user
            if(userChecks.length < config.maxChecks){
              //Create a random id for the check
              var checkId = helpers.createRandomString(20);
              //Create the check object, and include the user's phone
              var checkObject = {
                'id' : checkId,
                'userPhone' : userPhone,
                'protocol' : protocol,
                'url' : url,
                'method' : method,
                'successCodes' : successCodes,
                'timeoutSeconds' : timeoutSeconds
              };

              //Save the object
              _data.create('checks',checkId,checkObject,function(err){
                if(!err){
                  //Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  // Save the new user data
                  _data.update('users', userPhone,userData,function(err){
                    if(!err){
                      callback(200,checkObject);
                    }else {
                      callback(500,{'Error': 'Could not update the user with the new check'});
                    }
                  });
                }else {
                  callback(500,{'Error': 'Could not create the new check'});
                }
              });
            } else {
              callback(400,{'Error': 'The user already has the maximum number of the checks ('+config.maxChecks+')'});
            }
          }else {
            callback(403);
          }
        });
      }else {
        callback(403);
      }
    });

  }else {
    callback(400, {'Error': 'Missing required inputs, or inputs are invalid'});
  }
};

//Checks - get
//Required data : id
//Optional data : none
handlers._checks.get = function(data,callback){
let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
if(id) {
// lookup the check
_data.read('checks',id,function(err,checkData){
  if(!err && checkData){
    //Get the token from the headers
    let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
    //Verify that the given token is valid and belongs to the user who crated the check
    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
      if(tokenIsValid){
        //Return the check data
        callback(200,checkData);
      } else {
        callback(403);
      }
    });
  }else{
    callback(404);
  }
});
}else {
  calback(400,{'Error' : 'Missing requred field'});
}
};

// Checks - put
// Require data : id
// Optional data : protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
  //Check the require field
  let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
 //Check the optional field
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5  ? data.payload.timeoutSeconds : false;
   // Check the is is valid
  if(id) {
    // Check the optional fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds){
      //Lookup the check
      _data.read('checks', id, function(err,checkData){
        if(!err && checkData){
          let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
          //Verify that the given token is valid and belongs to the user who crated the check
          handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
            if(tokenIsValid){
              // Update the check where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(method){
                checkData.method = method;
              }
              if(url){
                checkData.url = url;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }
              // Store the new updates
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{Error: "Could not update the check"});
                }
              });
            }else {
              callback(403);
            }
          });
        }else {
          callback(400, {Error: "Check id did not exist"});
        }
      });
    } else {
      callback(400,{Error: "Missing fields to update"});
    }
  }else {
    callback(400,{'Error': 'Missing require field'});
  }
};

// Checks - delete
// Required - id
// Optional data - none
handlers._checks.delete = function(data,callback){
// Check that the phone number is valid
let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
if(id) {


// Look up the check
_data.read('checks', id, function(err,checkData){
  if(!err && checkData){
    //Get Token from header
  let token = typeof(data.headers.token) == 'string' ? data.headers.token: false;
   //verify that the given token is valid for the phonenumber
    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
      if(tokenIsValid){
        // Delete the check data
        _data.delete('checks', id, function(err){
          if(!err){
            _data.read('users', checkData.userPhone, function(err,userData){
              if(!err && userData){
                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks: [];

                // Remove the delete check from their list of Checks
                var checkPosition = userChecks.indexOf(id);
                if(checkPosition > -1){
                  userChecks.splice(checkPosition,1);
                  // Re-save user's data
                  _data.update('users', checkData.userPhone, userData, function(err,data){
                    if(!err){
                      callback(200);
                    } else {
                      callback(500,{'Error': 'Could not update the user'});
                    }
                  });
                }else {
                  callback(500,{Error: "Could not find the check on user object"});
                }
              } else {
                callback(500,{'Error': 'Could not the user who create the check, so could not remove the check from the list'});
              }
            });
          }else {
            callback(500, {Error : "Could not delete the check data"});
          }
        });



      } else {
        callback(403,{'Error' : 'Missing required token in header of invalid'});
      }
    });
  } else {
    callback(400, {Error: "The specified checkid is not exist"});
  }
});


}else {
  calback(400,{'Error' : 'Missing requred field'});
}
};



//Define not found handler
handlers.notFound = function(data, callback){
  callback(404);
};

//Export the module
module.exports = handlers;
