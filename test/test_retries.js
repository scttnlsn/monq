var assert = require('assert');
var sinon = require('sinon');
var helpers = require('./helpers');
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

        worker = new Worker([queue], { interval: 1 });
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
        beforeEach(function (done) {
            queue.enqueue('retry', {}, { attempts: { count: 3, delay: 10 } }, done);
        });

        describe('after first attempt', function () {
            beforeEach(function (done) {
                helpers.flushWorker(worker, done);
            });

            it('calls handler once', function () {
                assert.equal(handler.callCount, 1);
            });

            it('emits `failed` once', function () {
                assert.equal(failed.callCount, 1);
            });

            it('re-enqueues job', function () {
                var data = failed.lastCall.args[0];
                assert.equal(data.status, 'queued');
            });
        });

        describe('after all attempts', function () {
            beforeEach(function (done) {
                worker.start();

                // wait for all attempts
                setTimeout(function () {
                    worker.stop(done);
                }, 50);
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
    });
});