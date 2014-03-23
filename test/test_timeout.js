var assert = require('assert');
var helpers = require('./helpers');
var Queue = require('../lib/queue');
var sinon = require('sinon');
var Worker = require('../lib/worker');

describe('job', function() {
    var queue, handler, worker, failHandler;

    before(function(done) {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(function(params, callback) {
            // Don't call the callback, let it time out
        });

        failHandler = sinon.spy();

        worker = new Worker([ queue ], { interval: 10 });
        worker.register({ timeoutTest: handler });
        worker.start();

        worker.on('failed', failHandler);

        queue.collection.remove({}, done);
    });

    after(function(done) {
        worker.stop(done);
    });

    after(function(done) {
        queue.collection.remove({}, done);
    });

    describe('with a timeout', function() {
        it('enqueues', function(done) {
            queue.enqueue('timeoutTest', { test: 'data' }, { timeout: 10 }, done);
        });

        it('emits failed once', function(done) {
            (function finished() {
                if (failHandler.calledOnce) {
                    done();
                } else {
                    setTimeout(finished, 10);
                }
            })();
        });

        it('calls the handler once', function() {
            assert.ok(handler.calledOnce);
        });

        it('updates the job status', function() {
            var job = failHandler.lastCall.args[0];

            assert.equal(job.status, 'failed');
            assert.equal(job.error, 'Timed out');
        });
    });
});

describe('job', function() {
    var queue, handler, worker, failHandler;

    before(function(done) {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(
            function(params, callback) {
                //Don't call the callback, let it time out
            }
        );

        failHandler = sinon.spy();

        worker = new Worker([ queue ], { interval: 10 });
        worker.register({ timeoutTest: handler });
        worker.start();

        worker.on('failed', failHandler);

        queue.collection.remove({}, done);
    });

    after(function(done) {
        worker.stop(done);
    });

    after(function(done) {
        queue.collection.remove({}, done);
    });

    describe('with a timeout and retries', function() {
        it('enqueues', function(done) {
            queue.enqueue('timeoutTest', { test: 'data' }, { timeout: 10, attempts: { count: 3 } }, done);
        });

        it('emits failed three times', function(done) {
            (function hasFinished() {
                if (failHandler.calledThrice) {
                    done();
                } else {
                    setTimeout(hasFinished, 10);
                }
            })();
        });

        it('calls the handler three times', function() {
            assert.ok(handler.calledThrice);
        });

        it('updates the job status', function() {
            var job = failHandler.lastCall.args[0];

            assert.equal(job.status, 'failed');
            assert.equal(job.error, 'Timed out');
        });
    });
});