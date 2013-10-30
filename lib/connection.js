var mongo = require('mongoskin');
var job = require('./job');
var Queue = require('./queue');
var Worker = require('./worker');

module.exports = Connection;

function Connection(uri, options) {
    this.db = mongo.db(uri, options);
}

Connection.prototype.worker = function(queues, options) {
    var self = this;

    var queues = queues.map(function(queue) {
        if (typeof queue === 'string') {
            queue = self.queue(queue);
        }

        return queue;
    });

    return new Worker(queues, options);
};

Connection.prototype.queue = function(name, options) {
    return new Queue(this, name, options);
};

Connection.prototype.close = function() {
    this.db.close();
};