module.exports = Queue;

function Queue(name, jobs) {
    this.name = name || 'default';
    this.jobs = jobs;
}

Queue.prototype.enqueue = function(name, params, callback) {
    this.jobs.enqueue(name, params, this.name, callback);
};

Queue.prototype.dequeue = function(callback) {
    this.jobs.dequeue(this.name, callback);
};