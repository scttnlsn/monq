var mongoose = require('mongoose');

var Job = module.exports = new mongoose.Schema({
    name: { type: String, required: true },
    queue: { type: String },
    params: {},
    result: {},
    error: { type: String },
    status: { type: String, required: true, enum: ['queued', 'dequeued', 'complete', 'failed'] },
    enqueued: { type: Date },
    dequeued: { type: Date },
    ended: { type: Date }
});

Job.statics.enqueue = function(name, params, queue, callback) {
    var Job = this;

    var job = new Job({
        name: name,
        params: params,
        queue: queue,
        status: 'queued',
        enqueued: Date.now()
    });

    job.save(function(err) {
        if (err) return callback(err);
        callback(null, job);
    });
};

Job.statics.dequeue = function(queue, callback) {
    var Job = this;

    var query = { status: 'queued', queue: queue };
    var sort = { enqueued: 1 };
    var update = { '$set': { status: 'dequeued', dequeued: Date.now() }};
    var options = { new: true };

    this.collection.findAndModify(query, sort, update, options, function(err, doc) {
        if (err) return callback(err);
        if (!doc) return callback();

        var job = new Job();
        job.init(doc, function(err) {
            if (err) return callback(err);
            callback(null, job);
        });
    });
};

Job.methods.complete = function(result, callback) {
    this.result = result;
    this.status = 'complete';
    this.ended = Date.now();

    this.markModified('result');
    this.save(callback);
};

Job.methods.fail = function(err, callback) {
    this.error = err.message;
    this.status = 'failed';
    this.ended = Date.now();

    this.save(callback);
};