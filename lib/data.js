//jshint esversion:6

// Library for storing and editing data


const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

//Container for the module (to be exported)
let lib = {};

lib.baseDir = path.join(__dirname,"/.././.data/");
//write data to a file
lib.create = function(dir,file,data,callback){
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
    if(!err && fileDescriptor){
      // Convert data to string
      var stringData = JSON.stringify(data);
      //Write to file and close interval
      fs.writeFile(fileDescriptor,stringData,function(err){
        if(!err){
          fs.close(fileDescriptor, function(err){
            if(!err){
              callback(false);
            }else {
              calback("Error closing new file");
            }
          });
        }else {
          callback("Error writing to new File");
        }
      });
    }else {
      callback("Could not create new file");
    }
  });
};


//Read data from a file

lib.read = function(dir,file,callback){
  fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
    if(!err && data){
      let parseData = helpers.parseJsonToObject(data);
      callback(false,parseData);
    } else {
      callback(err,data);
    }
  });
};

//Update data inside a fileDescriptor

lib.update = function(dir,file,data,callback){
  //Open file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
    if (!err && fileDescriptor){
      let stringData = JSON.stringify(data);
      // Truncate the file
      fs.truncate(fileDescriptor,function(err){
        if(!err){
          fs.writeFile(fileDescriptor,stringData,function(err){
            if(!err){
              fs.close(fileDescriptor,function(err){
                if(!err){
                  callback(false);
                } else {
                  callback('error closing the file');
                }
              });
            }else {
              callback('Error writing to existing file');
            }
          });
        }else {
          callback('error truncating file');
        }
      });
    } else {
      callback('could not open file for updating');
    }

  });
};

//delete a file
lib.delete = function(dir,file,callback){
  //unlink the file
  fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
    if(!err){
      callback(false);
    } else {
      callback('Error delete file');
    }
  });
};
module.exports = lib;
