var mongoose = require('mongoose');

var Job = new mongoose.Schema({
    name: { type: String, required: true },
    queue: { type: String },
    params: {},
    status: { type: String, required: true, enum: ['queued'] },
    enqueued: { type: Date }
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

    job.save(callback);
};

module.exports = mongoose.model('Job', Job);