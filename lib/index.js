var mongoose = require('mongoose');
var mubsub = require('mubsub');

var monq = module.exports = {};

monq.Job = require('./job');
monq.Queue = require('./queue');
monq.Worker = require('./worker');

monq.pubsub = mubsub.channel('events');

monq.worker = function(options) {
    options.pubsub || (options.pubsub = monq.pubsub);
    return new monq.Worker(options);
};

monq.queue = function(name) {
    return new monq.Queue(name);
};

monq.subscribe = function(job, callback) {
    return monq.pubsub.subscribe({ 'job._id': job._id }, callback);
};

monq.connect = function(db) {
    mongoose.connect(db);
    mubsub.connect(db);
};

monq.disconnect = function() {
    mongoose.disconnect();
    mubsub.disconnect();
};