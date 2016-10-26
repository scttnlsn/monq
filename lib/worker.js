var events = require('events');
var util = require('util');
var Queue = require('./queue');

module.exports = Worker;

/**
* Options for a new worker
* @typedef {Object} Worker~Options
* @property {Number} interval - the polling interval for the worker. Note: The worker will process jobs, one at a time, as fast as possible while queues have waiting jobs
* @property {Worker~Strategies} strategies - {@link Worker~Strategies} for retrying jobs
* @property {Worker~Callbacks} callbacks - Map of {@link Worker~Callback} for processing jobs
* @property {Number} minPriority - The lowest job priority the worker will process
*/

/**
* @constructor
* @param {string[]} queues - an array of queue names that this worker will listen for
* @param {Worker~Options} options - {@link Worker~Options} Options object 
*/
function Worker(queues, options) {
    options || (options = {});

    this.empty = 0;
    this.queues = queues || [];
    this.interval = options.interval || 5000;

    this.callbacks = options.callbacks || {};
    this.strategies = options.strategies || {};
    this.universal = options.universal || false;

    // Default retry strategies
    this.strategies.linear || (this.strategies.linear = linear);
    this.strategies.exponential || (this.strategies.exponential = exponential);

    // This worker will only process jobs of this priority or higher
    this.minPriority = options.minPriority;

}

util.inherits(Worker, events.EventEmitter);

/**
* Job handler functions should take this form
* @callback Worker~Callback
* @param {Job.params} params - {@link Job.params} object for the job to be processed 
* @param {Function} callback - NodeJS style callback to be invoked when job processing is finished
*/

/**
* Sets handlers to be invoked for each queue that the worker is listening to
* @param {Object} callbacks - map of {@link Worker~Callback} objects. Keys are the name of the queue, values are the handlers for those queues
*/
Worker.prototype.register = function (callbacks) {
    for (var name in callbacks) {
        this.callbacks[name] = callbacks[name];
    }
};

/**
* A map of {@link Worker~StrategyCallback}s
* @typedef {Object} Worker~Strategies
*/

/**
* @callback Worker~StrategyCallback
* @param {Job~Attempts} attempts - {@link Job~Attempts} object
* @returns {Number} delay time
*/

Worker.prototype.strategies = function (strategies) {
    for (var name in strategies) {
        this.strategies[name] = strategies[name];
    }
};


/**
* Starts the worker.  If no queues have been specified yet, this will loop
*/
Worker.prototype.start = function () {
    if (this.queues.length === 0) {
        return setTimeout(this.start.bind(this), this.interval);
    }
    this.working = true;
    this.poll();
};

/**
* Stops the worker
*/
Worker.prototype.stop = function (callback) {
    var self = this;

    function done() {
        if (callback) callback();
    }

    if (!this.working) done();
    this.working = false;

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
      return done();
    }

    this.once('stopped', done);
};

/**
* Adds a queue for the worker to listen on
* @param {string} queue - the name of the queue to add
*/
Worker.prototype.addQueue = function (queue) {
  if (!this.universal)
    this.queues.push(queue);
};

Worker.prototype.poll = function () {
    if (!this.working) {
        return this.emit('stopped');
    }

    var self = this;

    this.dequeue(function (err, job) {
        if (err) return self.emit('error', err);

        if (job) {
            self.empty = 0;
            self.emit('dequeued', job.data);
            self.work(job);
        } else {
            self.emit('empty');

            if (self.empty < self.queues.length) {
                self.empty++;
            }

            if (self.empty === self.queues.length) {
                // All queues are empty, wait a bit
                self.pollTimeout = setTimeout(function () {
                    self.pollTimeout = null;
                    self.poll();
                }, self.interval);
            } else {
                self.poll();
            }
        }
    });
};

Worker.prototype.dequeue = function (callback) {
    var queue = this.queues.shift();
    this.queues.push(queue);
    queue.dequeue({ minPriority: this.minPriority, callbacks: this.callbacks }, callback);
};

Worker.prototype.work = function (job) {
    var self = this;
    var finished = false;

    if (job.data.timeout) {
        var timer = setTimeout(function () {
            done(new Error('timeout'));
        }, job.data.timeout);
    }

    function done(err, result) {
        // It's possible that this could be called twice in the case that a job times out,
        // but the handler ends up finishing later on
        if (finished) {
            return;
        } else {
            finished = true;
        }

        clearTimeout(timer);
        self.emit('done', job.data);

        if (err) {
            self.error(job, err, function (err) {
                if (err) return self.emit('error', err);

                self.emit('failed', job.data);
                self.poll();
            });
        } else {
            job.complete(result, function (err) {
                if (err) return self.emit('error', err);

                self.emit('complete', job.data);
                self.poll();
            });
        }
    };

    this.process(job.data, done);
};

Worker.prototype.process = function (data, callback) {
    var func = this.callbacks[data.name];

    if (!func) {
        callback(new Error('No callback registered for `' + data.name + '`'));
    } else {
        func(data.params, callback);
    }
};

Worker.prototype.error = function (job, err, callback) {
    var attempts = job.data.attempts;
    var remaining = 0;

    if (attempts) {
        remaining = attempts.remaining = (attempts.remaining || attempts.count) - 1;
    }

    if (remaining > 0) {
        var strategy = this.strategies[attempts.strategy || 'linear'];
        if (!strategy) {
            strategy = linear;

            console.error('No such retry strategy: `' + attempts.strategy + '`');
            console.error('Using linear strategy');
        }

        if (attempts.delay !== undefined) {
            var wait = strategy(attempts);
        } else {
            var wait = 0;
        }

        job.delay(wait, callback)
    } else {
        job.fail(err, callback);
    }
};

// Strategies
// ---------------

function linear(attempts) {
    return attempts.delay;
}

function exponential(attempts) {
    return attempts.delay * (attempts.count - attempts.remaining);
}
