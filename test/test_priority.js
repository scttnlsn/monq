var assert = require('assert');
var async = require('async');
var sinon = require('sinon');
var helpers = require('./helpers');
var Queue = require('../lib/queue');
var Worker = require('../lib/worker');
var jobs = require('./fixtures/priority_jobs');

describe('Priority', function () {
    var handler, queue, worker;

    beforeEach(function () {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(function (params, callback) {
            callback();
        });
    });

    afterEach(function (done) {
        queue.collection.remove({}, done);
    });

    describe('worker with no minimum priority', function () {
        beforeEach(function (done) {
            worker = new Worker([queue], { interval: 1 });
            worker.register({ priority: handler });

            helpers.each(jobs, queue.enqueue.bind(queue), done);
        });

        beforeEach(function (done) {
            helpers.flushWorker(worker, done);
        });

        it('calls handler once for each job', function () {
            assert.equal(handler.callCount, 9);
        });

        it('processes jobs with higher priority first', function () {
            var labels = handler.args.map(function (args) {
                return args[0].label;
            });

            assert.deepEqual(labels, ['i', 'h', 'd', 'e', 'f', 'g', 'b', 'c', 'a']);
        });
    });

    describe('worker with minimum priority', function () {
        beforeEach(function (done) {
            worker = new Worker([queue], { interval: 1, minPriority: 1 });
            worker.register({ priority: handler });

            helpers.each(jobs, queue.enqueue.bind(queue), done);
        });

        beforeEach(function (done) {
            helpers.flushWorker(worker, done);
        });

        it('calls handler once for each job with sufficient priority', function () {
            assert.equal(handler.callCount, 2);
        });

        it('processes jobs with higher priority first', function () {
            var labels = handler.args.map(function (args) {
                return args[0].label;
            });

            assert.deepEqual(labels, ['i', 'h']);
        });
    });
});