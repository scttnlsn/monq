var events = require('events');
var util = require('util');
var Queue = require('./queue');

module.exports = Worker;

function Worker(queues, options) {
    options || (options = {});
    options.queues || (options.queues = []);

    this.empty = 0;
    this.queues = queues;
    this.callbacks = options.callbacks || {};
    this.interval = options.interval || 5000;

    if (this.queues.length === 0) {
        throw new Error('Worker must have at least one queue.');
    }
}

util.inherits(Worker, events.EventEmitter);

Worker.prototype.register = function(callbacks) {
    for (var name in callbacks) {
        this.callbacks[name] = callbacks[name];
    }
};

Worker.prototype.start = function() {
    this.working = true;
    this.poll();
};

Worker.prototype.stop = function() {
    this.working = false;
};

Worker.prototype.poll = function() {
    if (!this.working) return;

    var self = this;

    this.dequeue(function(err, job) {
        if (err) return self.emit('error', err);

        if (job) {
            self.empty = 0;
            self.emit('dequeued', job.data);
            self.work(job);
        } else {
            if (self.empty < self.queues.length) {
                self.empty++;
            }

            if (self.empty === self.queues.length) {
                // All queues are empty, wait a bit
                setTimeout(function() {
                    self.poll();
                }, self.interval);
            } else {
                self.poll();
            }
        }
    });
};

Worker.prototype.dequeue = function(callback) {
    var queue = this.queues.shift();
    this.queues.push(queue);
    queue.dequeue(callback);
};

Worker.prototype.work = function(job) {
    var self = this;

    this.process(job.data, function(err, result) {
        if (err) {
            job.fail(err, function(err) {
                if (err) return self.emit('error', err);

                self.emit('failed', job.data);
                self.poll();
            });
        } else {
            job.complete(result, function(err) {
                if (err) return self.emit('error', err);

                self.emit('complete', job.data);
                self.poll();
            });
        }
    });
};

Worker.prototype.process = function(data, callback) {
    var func = this.callbacks[data.name];

    if (!func) {
        callback(new Error('No callback registered for `' + data.name + '`'));
    } else {
        func(data.params, callback);
    }
};