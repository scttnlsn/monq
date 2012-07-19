var Job = require('./job');

module.exports = Queue;

function Queue(name) {
    this.name = name || 'default';
};

Queue.prototype.enqueue = function(name, params, callback) {
    Job.enqueue(name, params, this.name, callback);
};

Queue.prototype.dequeue = function(callback) {
    Job.dequeue(this.name, callback);
};