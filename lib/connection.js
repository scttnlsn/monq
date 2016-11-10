var mongo = require('mongojs');
var job = require('./job');
var Queue = require('./queue');
var Worker = require('./worker');

module.exports = Connection;

/**
* @constructor
* @param {string} uri - MongoDB connection string
* @param {Object} options - connection options
*/
function Connection(uri, options) {
    this.db = mongo(uri, [], options);
}

/**
* Returns a new {@link Worker}
* @param {string[]|string} queues - list of queue names, a single queue name, or '*' for a universal worker
* @param {Object} options - an object with worker options
*/
Connection.prototype.worker = function (queues, options) {
    var self = this,
        opts;

    if (queues === "*") {
        opts = {universal: true, collection: options.collection || 'jobs' };
        options.universal = true;
        queues = [new Queue('*', opts)];
    } else {
        if (!Array.isArray(queues)) {
            queues = [queues];
        }

        opts = {collection: options.collection || 'jobs' };
        var queues = queues.map(function (queue) {
            if (typeof queue === 'string') {
                queue = self.queue(queue, opts);
            }

            return queue;
        });
    }
    return new Worker(queues, options);
};

Connection.prototype.queue = function (name, options) {
    return new Queue(this, name, options);
};

Connection.prototype.close = function () {
    this.db.close();
};
