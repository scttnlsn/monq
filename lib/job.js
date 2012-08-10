var events = require('events');
var util = require('util');

module.exports = Job;

function Job(adapter, data) {
    this.collection = adapter.collection;
    this.events = adapter.events;
    this.data = data || {};
}

util.inherits(Job, events.EventEmitter);

Job.prototype.save = function(callback) {
    var self = this;

    var subscribe = function() {
        if (!self.events || self.subscription) return;

        self.subscription = self.events.subscribe({ _id: self.data._id }, function(data) {
            self.data = data;

            self.emit('status', data);
            self.emit(data.status, data);
        });
    };
    
    this.collection.save(this.data, function(err, doc) {
        if (err) return callback(err);

        if (doc) self.data = doc;
        subscribe();

        callback(null, self);
    });
};

Job.prototype.complete = function(result, callback) {
    this.data.status = 'complete';
    this.data.ended = Date.now();
    this.data.result = result;
    this.save(callback);
};

Job.prototype.fail = function(error, callback) {
    this.data.status = 'failed';
    this.data.ended = Date.now();
    this.data.error = error.message;
    this.save(callback);
};

Job.prototype.publish = function(callback) {
    if (!this.events) return;
    this.events.publish(this.data, callback);
};