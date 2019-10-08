//jshint esversion:6

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');

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
//@TODO only let an authenticated user access their object.
handlers._users.get = function(data,callback){
let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
if(phone) {
  _data.read('users', phone, function(err,data){
    if(!err && data){
      //Remove the hashed password before return to the requester
      delete data.hashedPassword;
      callback(200,data);
    } else {
      callback(404);
    }
  });
}else {
  calback(400,{'Error' : 'Missing requred field'});
}
};
//Users - put
//Require data: phone
//Optional data: firstName, lastName, password (at lease one must be specified)
//@TODO only let an authenticated user access their object.
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
    //lookup the user
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
    callback(400,{'Error': 'Missing fields to update'});
  }

} else {
  callback(400,{'Error': 'Missing required field'});
}


};
//User - delete
//Require data: phone
//Optional data: none
//@TODO only let an authenticated user delete their object.
//@TODO cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data,callback){
// Check that the phone number is valid
let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
if(phone) {
  _data.read('users', phone, function(err,data){
    if(!err && data){
      _data.delete('users', phone, function(err,data){
        if(!err){
          callback(200);
        } else {
          callback(500,{'Error': 'Could not delete the user'});
        }
      });
    } else {
      callback(404,{'Error': 'Could not find the user'});
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
