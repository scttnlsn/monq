var Job = require('./job');
var mongoskin = require('mongoskin');

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

    if(options.index !== false){
        this.ensureIndex();
    }
}

Queue.prototype.job = function(data) {
    return new Job(this.collection, data);
};

Queue.prototype.fetchJob = function(id, callback){
    if(typeof id === 'string'){
        id = new mongoskin.BSONPure.ObjectID(id);
    }

    var self = this;
    this.collection.findOne({ _id: id }, function(err, data){
        callback(err, new Job(self.collection, data));
    });
};

Queue.prototype.enqueue = function(name, params, options, callback) {
    if(!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    var job = this.job({
        name: name,
        params: params,
        queue: this.name,
        status: 'queued',
        enqueued: new Date(),
        delay: options.delay || new Date(),
        retries: parseInt(options.retries, 10),
        retryDelayMS: typeof options.retryDelayMS === 'function' ? options.retryDelayMS.toString() : parseInt(options.retryDelayMS || 0, 10)
    });

    job.save(callback);
};

Queue.prototype.dequeue = function(callback) {
    var self = this;

    var query = { status: 'queued', queue: this.name, delay: {$lte: new Date()}};
    var sort = { enqueued: 1 };
    var update = { '$set': { status: 'dequeued', dequeued: new Date() }};
    var options = { new: true };

    this.collection.findAndModify(query, sort, update, options, function(err, doc) {
        if (err) return callback(err);
        if (!doc) return callback();

        callback(null, self.job(doc));
    });
};

Queue.prototype.ensureIndex = function(){
    // Drop old index
    var collection = this.collection;
    this.collection.indexExists('status_1_queue_1_enqueued_1', function(err, indexes) {
        if(err) console.error(err);
        if(indexes === true) {
            collection.dropIndex('status_1_queue_1_enqueued_1', function (err, result) {
                if(err) console.error(err);
            });
        }
    });
    //Ensures there's a reasonable index for the poling dequeue
    //Status is first b/c querying by status = queued should be very selective
    this.collection.ensureIndex({ status: 1, queue: 1, enqueued: 1, delay: 1 }, function(err){
        if(err) console.error(err);
    });
};