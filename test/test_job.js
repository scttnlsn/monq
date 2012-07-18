var assert = require('assert');
var helpers = require('./helpers');
var Job = require('../lib/job');

describe('Job', function() {
    before(function() {
        helpers.connect();
    });

    beforeEach(function(done) {
        Job.remove(done);
    });

    describe('when enqueueing', function() {
        var job;

        beforeEach(function(done) {
            Job.enqueue('foo', { bar: 'baz' }, 'qux', function(err, instance) {
                if (err) return done(err);

                job = instance;
                done();
            });
        });

        it('has a name', function() {
            assert.equal(job.name, 'foo');
        });

        it('has a queue', function() {
            assert.equal(job.queue, 'qux');
        });

        it('has params', function() {
            assert.deepEqual(job.params, { bar: 'baz' });
        });

        it('has an enqueued date', function() {
            assert.ok(job.enqueued);
            assert.ok(job.enqueued <= Date.now());
        });

        it('has `queued` status', function() {
            assert.equal(job.status, 'queued');
        });
    });

    describe('when dequeueing', function() {
        var job;

        beforeEach(function(done) {
            Job.enqueue('foo1', { bar: 'baz' }, 'qux', function(err) {
                if (err) return done(err);

                Job.enqueue('foo2', { bar: 'baz' }, 'qux', function(err) {
                    if (err) return done(err);

                    Job.dequeue('qux', function(err, instance) {
                        if (err) return done(err);

                        job = instance;
                        done();
                    });
                });
            });
        });

        it('finds first job for given queue', function() {
            assert.ok(job);
            assert.equal(job.name, 'foo1');
            assert.equal(job.queue, 'qux');
        });

        it('has a dequeued date', function() {
            assert.ok(job.dequeued);
            assert.ok(job.dequeued < Date.now());
        });

        it('has `dequeued` status', function() {
            assert.equal(job.status, 'dequeued');
        });
    });

    describe('when completing job', function() {
        var job;

        beforeEach(function(done) {
            job = new Job({ name: 'foo', queue: 'qux' });
            job.complete({ bar: 'baz' }, done);
        });

        it('has a result', function() {
            assert.deepEqual(job.result, { bar: 'baz' });
        });

        it('has an ended time', function() {
            assert.ok(job.ended);
            assert.ok(job.ended <= Date.now());
        });

        it('has a `complete` status', function() {
            assert.equal(job.status, 'complete');
        });
    });

    describe('when failing job', function() {
        var job;

        beforeEach(function(done) {
            job = new Job({ name: 'foo', queue: 'qux' });
            job.fail(new Error('bar baz'), done);
        });

        it('has an error', function() {
            assert.equal(job.error, 'bar baz');
        });

        it('has an ended time', function() {
            assert.ok(job.ended);
            assert.ok(job.ended <= Date.now());
        });

        it('has a `failed` status', function() {
            assert.equal(job.status, 'failed');
        });
    });
});