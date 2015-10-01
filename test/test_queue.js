var assert = require('assert');
var helpers = require('./helpers');
var Queue = require('../lib/queue');

describe('Queue', function () {
    var queue;

    beforeEach(function () {
        queue = new Queue({ db: helpers.db });
    });

    afterEach(function (done) {
        queue.collection.remove({}, done);
    });

    describe('enqueue', function () {
        var job;

        beforeEach(function (done) {
            queue.enqueue('foo', { bar: 'baz' }, function (err, j) {
                job = j;
                done(err);
            });
        });

        it('has a name', function () {
            assert.equal(job.data.name, 'foo');
        });

        it('has a queue', function () {
            assert.equal(job.data.queue, 'default');
        });

        it('has params', function () {
            assert.deepEqual(job.data.params, { bar: 'baz' });
        });

        it('has an enqueued date', function () {
            assert.ok(job.data.enqueued);
            assert.ok(job.data.enqueued <= new Date());
        });

        it('has a delay timestamp', function () {
            assert.ok(job.data.delay);
            assert.ok(job.data.delay <= new Date());
            assert.ok(job.data.delay.getTime());
        });

        it('has `queued` status', function () {
            assert.equal(job.data.status, 'queued');
        });

        it('can be retrieved', function (done) {
            queue.get(job.data._id.toString(), function (err, doc) {
                if (err) return done(err);

                assert.ok(doc);
                assert.equal(doc.data._id.toString(), job.data._id.toString());
                assert.equal(doc.data.foo, job.data.foo);
                done();
            });
        });
    });

    describe('dequeue', function () {
        var job;

        beforeEach(function (done) {
            queue.enqueue('foo1', { bar: 'baz' }, function (err) {
                if (err) return done(err);

                var delay = new Date();
                delay.setFullYear(delay.getFullYear() + 10);

                queue.enqueue('foo2', { bar: 'baz' }, { delay: delay }, function (err) {
                    if (err) return done(err);

                    queue.dequeue(function (err, j) {
                        if (err) return done(err);

                        job = j;
                        done();
                    });
                });
            });
        });

        it('finds first job for given queue', function () {
            assert.ok(job);
            assert.equal(job.data.name, 'foo1');
            assert.equal(job.data.queue, 'default');
            assert.deepEqual(job.data.params, { bar: 'baz' });
        });

        it('has a dequeued date', function () {
            assert.ok(job.data.dequeued);
            assert.ok(job.data.dequeued <= new Date());
        });

        it('has `dequeued` status', function () {
            assert.equal(job.data.status, 'dequeued');
        });

        it('does not dequeue delayed job', function () {
            queue.dequeue(function (err, j) {
                assert.equal(err, undefined);
                assert.equal(j, undefined);
            });
        });
    });
});
