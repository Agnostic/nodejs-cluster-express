// Include the cluster module
var cluster = require('cluster'),
_           = require('underscore'),
fs          = require('fs'),
config      = require('./config/config');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var max_workers = 0;
    if(config.max_workers === 'auto'){
        max_workers = require('os').cpus().length / 2;
    } else {
        max_workers = config.max_workers;
    }

    var reloadWorkers = function(){
        _.each(cluster.workers, function(worker){
            worker.toRestart = true;
        });
        checkWorkers();
    };

    // Handle worker messages
    var onMessage = function(message){
        console.log('We got a message!', message);
    };

    // Check workers to restart
    var checkWorkers = function(){
        for(var i in cluster.workers){
            if(cluster.workers[i].toRestart && cluster.workers[i].state === 'listening'){
                cluster.workers[i].disconnect();
                var to_restart = _.filter(cluster.workers, function(cluster){ return cluster.toRestart; });
                console.log('Disconnected worker #'+cluster.workers[i].id+', to restart: ', to_restart.length);
                break;
            }
        }
    };

    // Create worker
    var createWorker = function(){
        var worker = cluster.fork();
        worker.on('message', onMessage);
        worker.on('online', function(){
            console.log('Worker #'+worker.id+' is online...');
            checkWorkers();
        });
        return worker;
    };

    // Watch version file
    if(config.fileToWatch){
        fs.watchFile(__dirname + '/' + config.fileToWatch, function(cur, prev){
            console.log('New version found!, reloading workers...');
            reloadWorkers();
        });
    }

    // Create a worker for each CPU
    for (var i = 0; i < max_workers; i++) {
        var worker = createWorker();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {
        // Replace the dead worker, we're not sentimental
        if(worker.suicide){
            console.log('Worker '+worker.id+' restarted...');
        } else {
            console.error('Worker '+worker.id+' died :(');
        }
        worker = createWorker();
    });

    // Disconnect
    cluster.on('disconnect', function (worker){
        console.log('Disconnect, restarting worker #' + worker.id);
        worker.kill();
    });

// Code to run if we're in a worker process
} else {

    require('./app/'+config.script)(cluster.worker);

}