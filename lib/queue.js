var Job = require('./job');

module.exports = Queue;

function Queue(connection, name, options) {
    if (typeof name === 'options' && options === undefined) {
        options = name;
        name = undefined;
    }

    options || (options = {});
    options.collection || (options.collection = 'jobs');

    this.connection = connection;
    this.name = name || 'default';
    this.options = options;

    this.collection = connection.db.collection(this.options.collection);
}

Queue.prototype.job = function(data) {
    return new Job(this.collection, data);
};

Queue.prototype.enqueue = function(name, params, callback) {
    var job = this.job({
        name: name,
        params: params,
        queue: this.name,
        status: 'queued',
        enqueued: new Date()
    });

    job.save(callback);
};

Queue.prototype.dequeue = function(callback) {
    var self = this;
    
    var query = { status: 'queued', queue: this.name };
    var sort = { enqueued: 1 };
    var update = { '$set': { status: 'dequeued', dequeued: new Date() }};
    var options = { new: true };

    this.collection.findAndModify(query, sort, update, options, function(err, doc) {
        if (err) return callback(err);
        if (!doc) return callback();

        callback(null, self.job(doc));
    });
};