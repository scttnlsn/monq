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
        var job2;

        beforeEach(function(done) {
            queue.enqueue('foo', { bar: 'baz' }, function(err, j) {
                job = j;
                if (err) return done(err);
                
                queue.enqueue('foo2', { bar: 'baz' }, { delay: new Date(0) }, function(err, j2) {
                    if (err) return done(err);
                    job2 = j2;
                    done();
                });
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

        it('has an delay date', function() {
            assert.ok(job.data.delay);
            assert.ok(job.data.delay <= new Date());
            assert.ok(job2.data.delay.getTime() == (new Date(0)).getTime());
        });

        it('has `queued` status', function() {
            assert.equal(job.data.status, 'queued');
        });

        it('can be gotten', function(done) {
            queue.fetchJob(job.data._id, function(err, fetchedJob) {
                if (err) return done(err);

                assert.ok(fetchedJob);
                assert.equal(fetchedJob.data._id.toString(), job.data._id.toString());
                assert.equal(fetchedJob.data.foo, job.data.foo);
                done();
            });
        });

        it('can be gotten by string id', function(done) {
            queue.fetchJob(job.data._id.toString(), function(err, fetchedJob) {
                if (err) return done(err);

                assert.ok(fetchedJob);
                assert.equal(fetchedJob.data._id.toString(), job.data._id.toString());
                assert.equal(fetchedJob.data.foo, job.data.foo);
                done();
            });
        });
    });

    describe('when dequeueing', function() {
        var job;
        var job2;

        beforeEach(function(done) {
            queue.enqueue('foo1', { bar: 'baz' }, function(err, j1) {
                if (err) return done(err);
                var d = new Date();
                d.setFullYear(d.getFullYear() + 10);
                queue.enqueue('foo2', { bar: 'baz' }, { delay: d }, function(err, j2) {
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

        it('does not dequeud delayed job', function() {
            queue.dequeue(function(err, j) {
                assert.equal(err, undefined);
                assert.equal(j, undefined);
            });
        });
    });
});