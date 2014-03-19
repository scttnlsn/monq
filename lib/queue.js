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

    var jobInfo = {
        name: name,
        params: params,
        queue: this.name,
        status: 'queued',
        enqueued: new Date(),
        delay: options.delay || new Date()
    };

    var attempts = options.attempts;
    if(attempts){
        if(typeof attempts !== 'object'){
            throw new Error('attempts must be an object');
        }

        if(attempts.delayMS != null && attempts.delayFunction != null){
            throw new Error('Only one of delayFunction and delayMS may be specified');
        }

        jobInfo.attempts = {};

        jobInfo.attempts.count = parseInt(attempts.count, 10);

        if(attempts.delayMS != null){
            jobInfo.attempts.delayMS = parseInt(attempts.delayMS, 10);
        }

        if(attempts.delayStrategy != null){
            if(attempts.delayStrategy !== 'exponential'){
                throw new Error('Unknown strategy: ' + attempts.delayStrategy);
            }

            if(attempts.delayMS == null){
                throw new Error('delayMS must be specified along with delayStrategy');
            }

            jobInfo.attempts.delayStrategy = attempts.delayStrategy;
        }
    }

    if(options.timeoutMS){
        jobInfo.timeoutMS = parseInt(options.timeoutMS, 10);
    }

    var job = this.job(jobInfo);

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

        if(doc.timeoutMS){
            doc.timeoutAt = new Date(new Date() + doc.timeoutMS);

            self.collection.updateById(doc._id, { $set: { timeoutAt: doc.timeoutAt } }, function(err){
                if(err){
                    console.error("An error occurred setting a job's timeoutAt value:");
                    console.error(err);
                }
            });
        }

        callback(null, self.job(doc));
    });
};

Queue.prototype.getTimedOutJob = function(gracePeriod, callback){
    var self = this;

    var query = {
        status: 'dequeued',
        queue: this.name,

        //Give the worker ample time to process the failure itself first to avoid a race condition
        timeoutAt: { $lt: new Date(new Date().getTime() + gracePeriod) }
    };
    var sort = { timeoutAt: 1 };
    var options = { new: true };

    //We only set the status to timeout temporarily to prevent the race condition of multiple processes timing out the same job.
    //The job will either be failed or retried.
    var update = { $set: { status: 'timedout' } };

    this.collection.findAndModify(query, sort, update, options, function(err, doc){
        callback(err, doc ? self.job(doc) : doc);
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