var Job = require('./job');
var mongoskin = require('mongoskin');

module.exports = Queue;

function Queue(connection, name, options) {
    if (typeof name === 'object' && options === undefined) {
        options = name;
        name = undefined;
    }

    options || (options = {});
    options.collection || (options.collection = 'jobs');

    this.connection = connection;
    this.name = name || 'default';
    this.options = options;

    this.collection = connection.db.collection(this.options.collection);

    if (options.index !== false) {
        this.ensureIndex();
    }
}

Queue.prototype.job = function(data) {
    return new Job(this.collection, data);
};

Queue.prototype.fetchJob = function(id, callback) {
    if (typeof id === 'string') {
        id = new mongoskin.BSONPure.ObjectID(id);
    }

    var self = this;
    this.collection.findOne({ _id: id }, function(err, data) {
        callback(err, new Job(self.collection, data));
    });
};

Queue.prototype.enqueue = function(name, params, options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }

    var info = {
        name: name,
        params: params,
        queue: this.name,
        status: 'queued',
        enqueued: new Date(),
        delay: options.delay || new Date(),

        // priority must be defaulted to zero for sorting of negative priorities to work
        priority: options.priority || 0
    };

    var attempts = options.attempts;

    if (attempts) {
        if (typeof attempts !== 'object') {
            throw new Error('attempts must be an object');
        }

        info.attempts = {};
        info.attempts.count = parseInt(attempts.count, 10);

        if (attempts.delay !== undefined) {
            info.attempts.delay = parseInt(attempts.delay, 10);
        }

        if (attempts.strategy !== undefined) {
            if (attempts.delay === undefined) {
                throw new Error('delay must be specified along with strategy');
            }

            info.attempts.strategy = attempts.strategy;
        }
    }

    if (options.timeout) {
        info.timeout = parseInt(options.timeout, 10);
    }

    var job = this.job(info);

    job.save(callback);
};

Queue.prototype.dequeue = function(options, callback) {
    var self = this;

    if (callback === undefined) {
        callback = options;
        options = {};
    }

    var query = {
        status: 'queued',
        queue: this.name,
        delay: { $lte: new Date() }
    };

    if (options.minPriority !== undefined) {
        query.priority = { $gte: options.minPriority };
    }

    var sort = [['priority', 'desc'], ['_id', 'asc']];
    var update = { '$set': { status: 'dequeued', dequeued: new Date() }};
    var options = { new: true };

    this.collection.findAndModify(query, sort, update, options, function(err, doc) {
        if (err) return callback(err);
        if (!doc) return callback();

        if (doc.timeout) {
            doc.expiration = new Date(new Date() + doc.timeout);

            var query = {
                $set: { expiration: doc.expiration }
            };

            self.collection.updateById(doc._id, query, function(err) {
                if (err) {
                    console.error("An error occurred setting a job's expiration value:");
                    console.error(err);
                }
            });
        }

        callback(null, self.job(doc));
    });
};

Queue.prototype.ensureIndex = function() {
    var collection = this.collection;

    // Drop old indexes

    this.collection.indexExists('status_1_queue_1_enqueued_1', function(err, indexes) {
        if (err) console.error(err);

        if (indexes === true) {
            collection.dropIndex('status_1_queue_1_enqueued_1', function (err, result) {
                if (err) console.error(err);
            });
        }
    });

    this.collection.indexExists('status_1_queue_1_enqueued_1_delay_1', function(err, indexes) {
        if (err) console.error(err);

        if (indexes === true) {
            collection.dropIndex('status_1_queue_1_enqueued_1_delay_1', function (err, result) {
                if (err) console.error(err);
            });
        }
    });

    // Ensures there's a reasonable index for the poling dequeue
    // Status is first b/c querying by status = queued should be very selective
    this.collection.ensureIndex({ status: 1, queue: 1, priority: 1, _id: 1, delay: 1 }, function(err) {
        if (err) console.error(err);
    });
};