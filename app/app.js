var config = require('../config/config');

module.exports = function(worker){

  var express = require('express');
  app         = express();

  app.get('/', function(req, res){
    res.end('Hello from worker #'+worker.id);
  });

  app.get('/event', function(req, res){
    worker.send({ hello: 'Worker' });
    res.end('Sending event to master cluster...');
  });

  app.listen(config.port);

};