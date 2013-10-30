var assert = require('assert');
var helpers = require('./helpers');
var Queue = require('../lib/queue');

describe('queue', function() {
    var queue;

    beforeEach(function() {
        queue = new Queue({ db: helpers.db });
    });

    afterEach(function(done) {
        queue.collection.remove({}, done);
    });

    describe('when enqueueing', function() {
        var job;

        beforeEach(function(done) {
            queue.enqueue('foo', { bar: 'baz' }, function(err, j) {
                if (err) return done(err);

                job = j;
                done();
            });
        });

        it('has a name', function() {
            assert.equal(job.data.name, 'foo');
        });

        it('has a queue', function() {
            assert.equal(job.data.queue, 'default');
        });

        it('has params', function() {
            assert.deepEqual(job.data.params, { bar: 'baz' });
        });

        it('has an enqueued date', function() {
            assert.ok(job.data.enqueued);
            assert.ok(job.data.enqueued <= new Date());
        });

        it('has `queued` status', function() {
            assert.equal(job.data.status, 'queued');
        });
    });

    describe('when dequeueing', function() {
        var job;

        beforeEach(function(done) {
            queue.enqueue('foo1', { bar: 'baz' }, function(err, j1) {
                if (err) return done(err);

                queue.enqueue('foo2', { bar: 'baz' }, function(err, j2) {
                    if (err) return done(err);

                    queue.dequeue(function(err, j) {
                        if (err) return done(err);

                        job = j;
                        done();
                    });
                });
            });
        });

        it('finds first job for given queue', function() {
            assert.ok(job);
            assert.equal(job.data.name, 'foo1');
            assert.equal(job.data.queue, 'default');
            assert.deepEqual(job.data.params, { bar: 'baz' });
        });

        it('has a dequeued date', function() {
            assert.ok(job.data.dequeued);
            assert.ok(job.data.dequeued <= new Date());
        });

        it('has `dequeued` status', function() {
            assert.equal(job.data.status, 'dequeued');
        });
    });
});