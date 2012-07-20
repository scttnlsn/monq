var events = require('events');
var mubsub = require('mubsub');
var path = require('path');
var util = require('util');
var Queue = require('./queue');

module.exports = Worker;

function Worker(options) {
    options || (options = {});
    options.queues || (options.queues = ['default']);

    this.path = options.path || [];
    this.interval = options.interval || 5000;
    this.pubsub = options.pubsub;
    this.empty = 0;
    this.queues = options.queues.map(function(name) {
        return new Queue(name);
    });
};

util.inherits(Worker, events.EventEmitter);

Worker.prototype.publish = function(event, job) {
    if (job.toObject !== undefined) {
        job = job.toObject();
    }

    this.emit(event, job);

    if (this.pubsub) {
        this.pubsub.publish({ event: event, queue: job.queue, job: job });
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
            self.publish('dequeued', job);
            self.work(job);
        } else {
            if (self.empty < self.queues.length) {
                self.empty++;
            }

            if (self.empty === self.queues.length) {
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

    this.process(job, function(err, result) {
        if (err) {
            job.fail(err, function(err) {
                if (err) return self.emit('error', err);

                self.publish('failed', job);
                self.poll();
            });
        } else {
            job.complete(result, function(err) {
                if (err) return self.emit('error', err);

                self.publish('complete', job);
                self.poll();
            });
        }
    });
};

Worker.prototype.process = function(job, callback) {
    var paths = this.path.map(function(item) {
        return path.resolve(item, job.name);
    });

    function find() {
        var item = paths.shift();

        if (!item) return null;

        try {
            return require(item);
        } catch(e) {
            return find();
        }
    }

    var func = find();

    if (!func) {
        callback(new Error('No such job `' + job.name + '`'));
    } else {
        func(job, callback);
    }
};