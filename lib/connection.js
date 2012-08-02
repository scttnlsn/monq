var mongoose = require('mongoose');
var mubsub = require('mubsub');
var Job = require('./job');
var Queue = require('./queue');
var Worker = require('./worker');

module.exports = Connection;

function Connection(connection) {
    this.connection = connection || mongoose.connection;
    this.pubsub = mubsub.channel('events');

    var self = this;

    this.connection.on('open', function() {
        if (mubsub.connection.state !== 0) return;
        mubsub.connect({ db: self.connection.db });
    });
}

Connection.prototype.worker = function(options) {
    options || (options = {});
    options.pubsub || (options.pubsub = this.pubsub);
    options.queues || (options.queues = ['default']);

    var self = this;

    options.queues = options.queues.map(function(queue) {
        return (typeof queue === 'string') ? self.queue(queue) : queue;
    });

    return new Worker(options);
};

Connection.prototype.queue = function(name) {
    return new Queue(name, this.connection.model('Job', Job));
};

Connection.prototype.subscribe = function(id, callback) {
    return this.pubsub.subscribe({ 'job._id': id }, callback);
};

Connection.prototype.connect = function() {
    this.connection.open.apply(this.connection, arguments);
    return this;
};

Connection.prototype.disconnect = function() {
    this.connection.close();
};