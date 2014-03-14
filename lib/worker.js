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

Worker.prototype.stop = function(callback) {
    var self = this;

    var wasWorking = this.working;
    this.working = false;

    //If a callback is passed, call it when the worker has finished its current job
    if(callback){
        if(wasWorking) {
            var doneListener = function() {
                self.removeListener('poll-not-working', notWorkingListener); //Remove other listener, as only one or the other will be called
                callback();
            };

            var notWorkingListener = function() {
                self.removeListener('done', doneListener); //Remove other listener, as only one or the other will be called
                callback();
            };

            //If a job is in progress (or is getting dequeued) when the queue is stopped, wait for it to finish
            this.once('done', doneListener);

            //When stopping this worker, it may currently be polling and not find any jobs to process
            this.once('poll-not-working', notWorkingListener);
        } else {
            callback();
        }
    }
};

Worker.prototype.poll = function() {
    if (!this.working) {
        this.emit('poll-not-working');
        return;
    }

    var self = this;

    this.dequeue(function(err, job) {
        if (err) return self.emit('error', err);

        if (job) {
            self.empty = 0;
            self.emit('dequeued', job.data);
            self.work(job);
        } else {
            self.emit('empty-dequeue');

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
    var finishCalled = false;

    if(job.data.timeoutMS){
        var timeoutTimer = setTimeout(function(){
            finishedHandler('Timed out');
        }, job.data.timeoutMS);
    }

    var finishedHandler = function(err, result) {
        //It's possible that this could be called twice in the case that a job times out, but the handler ends up
        //finishing later on
        if(finishCalled){
            return;
        } else {
            finishCalled = true;
        }

        clearTimeout(timeoutTimer);
        self.emit('done', job.data);

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
    };

    this.process(job.data, finishedHandler);
};

Worker.prototype.process = function(data, callback) {
    var func = this.callbacks[data.name];

    if (!func) {
        callback(new Error('No callback registered for `' + data.name + '`'));
    } else {
        func(data.params, callback);
    }
};