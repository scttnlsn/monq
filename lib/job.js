var events = require('events');
var util = require('util');

module.exports = Job;

function Job(collection, data) {
    this.collection = collection;

    if (data) {
        // Convert plain object to JobData type
        data.__proto__ = JobData.prototype;
        this.data = data;
    } else {
        this.data = new JobData();
    }
}

util.inherits(Job, events.EventEmitter);

Job.prototype.save = function(callback) {
    var self = this;
    
    this.collection.save(this.data, function(err, doc) {
        if (err) return callback(err);

        if (doc && self.data._id === undefined) {
            self.data._id = doc._id;
        }

        callback(null, self);
    });
};

Job.prototype.cancel = function(callback) {
    if (this.data.status !== 'queued') {
        return callback(new Error('Only queued jobs may be cancelled'));
    }

    this.data.status = 'cancelled';
    this.data.ended = new Date();

    this.save(callback);
};

Job.prototype.complete = function(result, callback) {
    this.data.status = 'complete';
    this.data.ended = new Date();
    this.data.result = result;

    this.save(callback);
};

Job.prototype.fail = function(err, callback) {
    this.data.status = 'failed';
    this.data.ended = new Date();
    this.data.error = err.message;
    this.data.stack = err.stack;

    this.save(callback);
};

Job.prototype.retry = function(delay, callback) {
    this.data.status = 'queued';
    this.data.delay = new Date(new Date().getTime() + delay);

    this.save(callback);
}

function JobData() {}

Object.defineProperty(JobData.prototype, 'id', {
    get: function() {
        return this._id && this._id.toString && this._id.toString();
    }
});
