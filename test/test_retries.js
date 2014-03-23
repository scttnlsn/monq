var assert = require('assert');
var sinon = require('sinon');
var helpers = require('./helpers');
var Job = require('../lib/job');
var Queue = require('../lib/queue');
var Worker = require('../lib/worker');

describe('Retries', function () {
    var queue, handler, worker, failed;

    beforeEach(function () {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(function (params, callback) {
            return callback(new Error());
        });

        failed = sinon.spy();

        worker = new Worker([queue], { interval: 10 });
        worker.register({ retry: handler });
        worker.on('failed', failed);
    });

    afterEach(function (done) {
        queue.collection.remove({}, done);
    });

    describe('worker retrying job', function () {
        beforeEach(function (done) {
            queue.enqueue('retry', {}, { attempts: { count: 3 } }, done);
        });

        beforeEach(function (done) {
            helpers.flushWorker(worker, done);
        });

        it('calls the handler once for each retry', function () {
            assert.equal(handler.callCount, 3);
        });

        it('emits failed once for each failed attempt', function () {
            assert.equal(failed.callCount, 3);
        });

        it('updates the job status', function () {
            var job = failed.lastCall.args[0];

            assert.equal(job.attempts.remaining, 0);
            assert.equal(job.attempts.count, 3);
            assert.equal(job.status, 'failed');
        });
    });

    describe('worker retrying job with delay', function () {
        var start;

        beforeEach(function (done) {
            queue.enqueue('retry', {}, { attempts: { count: 3, delay: 100 } }, done);
        });

        describe('after first attempt', function () {
            beforeEach(function (done) {
                start = new Date();
                helpers.flushWorker(worker, done);
            });

            it('calls handler once', function () {
                assert.equal(handler.callCount, 1);
            });

            it('emits `failed` once', function () {
                assert.equal(failed.callCount, 1);
            });

            it('re-enqueues job with delay', function () {
                var data = failed.lastCall.args[0];
                assert.equal(data.status, 'queued');
                assert.ok(new Date(data.delay).getTime() >= start.getTime() + 100);
            });

            it('does not immediately dequeue job', function (done) {
                helpers.flushWorker(worker, function () {
                    assert.equal(handler.callCount, 1);
                    done();
                });
            });
        });

        describe('after all attempts', function () {
            var delay;

            beforeEach(function () {
                delay = sinon.stub(Job.prototype, 'delay', function (delay, callback) {
                    assert.equal(delay, 100);

                    this.data.delay = new Date();
                    this.enqueue(callback);
                });
            });

            beforeEach(function (done) {
                helpers.flushWorker(worker, done);
            });

            afterEach(function () {
                delay.restore();
            });

            it('calls the handler once for each retry', function () {
                assert.equal(handler.callCount, 3);
            });

            it('emits failed once for each failed attempt', function () {
                assert.equal(failed.callCount, 3);
            });

            it('updates the job status', function () {
                var data = failed.lastCall.args[0];

                assert.equal(data.attempts.remaining, 0);
                assert.equal(data.attempts.count, 3);
                assert.equal(data.status, 'failed');
            });
        });
    });

    describe('worker retrying job with no retries', function () {
        beforeEach(function (done) {
            queue.enqueue('retry', {}, { attempts: { count: 0 }}, done);
        });

        beforeEach(function (done) {
            helpers.flushWorker(worker, done);
        });

        it('calls the handler once', function () {
            assert.equal(handler.callCount, 1);
        });

        it('emits failed once', function () {
            assert.equal(failed.callCount, 1);
        });

        it('updates the job status', function () {
            var data = failed.lastCall.args[0];

            assert.equal(data.status, 'failed');
        });
    });
});