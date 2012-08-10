var Job = require('./job');

module.exports = Queue;

function Queue(connection, name, options) {
    if (typeof name === 'options' && options === undefined) {
        options = name;
        name = undefined;
    }

    options || (options = {});
    options.collection || (options.collection = 'jobs');
    options.events || (options.events = 'events');

    this.connection = connection;
    this.name = name || 'default';
    this.options = options;

    this.collection = connection.db.collection(this.options.collection);
    this.events = connection.pubsub.channel(this.options.events);
}

Queue.prototype.job = function(data) {
    var adapter = { collection: this.collection, events: this.events };
    return new Job(adapter, data);
};

Queue.prototype.enqueue = function(name, params, callback) {
    var job = this.job({
        name: name,
        params: params,
        queue: this.name,
        status: 'queued',
        enqueued: Date.now()
    });

    job.save(callback);
};

Queue.prototype.dequeue = function(callback) {
    var self = this;
    
    var query = { status: 'queued', queue: this.name };
    var sort = { enqueued: 1 };
    var update = { '$set': { status: 'dequeued', dequeued: Date.now() }};
    var options = { new: true };

    this.collection.findAndModify(query, sort, update, options, function(err, doc) {
        if (err) return callback(err);
        if (!doc) return callback();

        callback(null, self.job(doc));
    });
};