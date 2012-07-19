var events = require('events');
var mubsub = require('mubsub');
var util = require('util');
var Promise = require('./promise');
var Queue = require('./queue');
var User = require('./user');

module.exports = Session;

function Session(token, options) {
    options || (options = {});

    this.pubsub = options.pubsub || mubsub.channel('events');
    this.token = token;
    this.promise = new Promise();
    this.subscriptions = [];

    var self = this;

    User.findOne({ token: this.token }, function(err, user) {
        if (err) return self.promise.resolve(err);
        if (!user) return self.promise.resolve(new Error('Invalid token'));

        self.promise.resolve(null, user);
    });
}

util.inherits(Session, events.EventEmitter);

Session.prototype.subscribe = function(job) {
    var self = this;

    var subscription = this.pubsub.subscribe({ 'job._id': job._id }, function(err, doc) {
        if (err) {
            self.emit('error', err);
        } else {
            self.emit('status', doc);
        }
    });

    this.subscriptions.push(subscription);
};

Session.prototype.unsubscribe = function() {
    this.subscriptions.forEach(function(subscription) {
        subscription.unsubscribe();
    });

    this.subscriptions = [];
};

Session.prototype.enqueue = function(queue, name, params, callback) {
    var self = this;

    this.promise.then(function(err, user) {
        if (err) return callback(err);
        if (!user.allowed(queue, name)) return callback(new Error('Unauthorized'));

        var q = new Queue(queue);

        q.enqueue(name, params, function(err, job) {
            if (job) self.subscribe(job);
            callback(err, job);
        });
    });
};