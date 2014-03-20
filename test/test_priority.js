var assert = require('assert');
var helpers = require('./helpers');
var Queue = require('../lib/queue');
var sinon = require('sinon');
var Worker = require('../lib/worker');

describe('job', function() {
    var queue, handler, worker;

    before(function(done) {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(
            function(params, callback){
                callback();
            }
        );

        worker = new Worker([ queue ], { interval: 10 });
        worker.register({ priority: handler });

        queue.collection.remove({}, done);
    });

    after(function(done){
        worker.stop(done);
    });

    after(function(done){
        queue.collection.remove({}, done);
    });

    describe('with priority', function(){
        it('enqueues a negative 2 priority job', function(done){
            queue.enqueue('priority', { data: 'negative-priority-2' }, { priority: -2 }, done);
        });

        it('enqueues a negative 1 priority job', function(done){
            queue.enqueue('priority', { data: 'negative-priority-1-1' }, { priority: -1 }, done);
        });

        it('enqueues a negative 1 priority job', function(done){
            queue.enqueue('priority', { data: 'negative-priority-1-2' }, { priority: -1 }, done);
        });

        it('enqueues a default priority job', function(done){
            queue.enqueue('priority', { data: 'priority-default-1' }, done);
        });

        it('enqueues a default priority job', function(done){
            queue.enqueue('priority', { data: 'priority-default-2' }, done);
        });

        it('enqueues a priority 0 job', function(done){
            queue.enqueue('priority', { data: 'priority-0-1' }, { priority: 0 }, done);
        });

        it('enqueues a priority 0 job', function(done){
            queue.enqueue('priority', { data: 'priority-0-2' }, { priority: 0 }, done);
        });

        it('enqueues a priority 1 job', function(done){
            queue.enqueue('priority', { data: 'priority-1' }, { priority: 1 }, done);
        });

        it('starts working', function(){
            worker.start();
        });

        it('calls the handler 5 times', function(done){
            (function hasFinished(){
                if(handler.callCount === 8){
                    done();
                } else {
                    setTimeout(hasFinished, 10);
                }
            })();
        });

        it('processes the jobs in the correct order', function(){
            assert.equal(handler.args[0][0].data, 'priority-1');
            assert.equal(handler.args[1][0].data, 'priority-default-1');
            assert.equal(handler.args[2][0].data, 'priority-default-2');
            assert.equal(handler.args[3][0].data, 'priority-0-1');
            assert.equal(handler.args[4][0].data, 'priority-0-2');
            assert.equal(handler.args[5][0].data, 'negative-priority-1-1');
            assert.equal(handler.args[6][0].data, 'negative-priority-1-2');
            assert.equal(handler.args[7][0].data, 'negative-priority-2');
        });
    });
});

describe('worker', function() {
    var queue, handler, worker;

    before(function(done) {
        queue = new Queue({ db: helpers.db });

        handler = sinon.spy(
            function(params, callback){
                callback();
            }
        );

        worker = new Worker([ queue ], { interval: 10, minPriority: 1 });
        worker.register({ priority: handler });

        queue.collection.remove({}, done);
    });

    after(function(done){
        worker.stop(done);
    });

    after(function(done){
        queue.collection.remove({}, done);
    });

    describe('with minimum priority', function(){
        it('enqueues a negative 1 priority job', function(done){
            queue.enqueue('priority', { data: 'negative-priority' }, { priority: -1 }, done);
        });

        it('enqueues a default priority job', function(done){
            queue.enqueue('priority', { data: 'priority-default' }, done);
        });

        it('enqueues a priority 0 job', function(done){
            queue.enqueue('priority', { data: 'priority-0' }, { priority: 0 }, done);
        });

        it('enqueues a priority 1 job', function(done){
            queue.enqueue('priority', { data: 'priority-1' }, { priority: 1 }, done);
        });

        it('enqueues a priority 2 job', function(done){
            queue.enqueue('priority', { data: 'priority-2' }, { priority: 2 }, done);
        });

        it('starts working', function(){
            worker.start();
        });

        it('calls the handler 2 times', function(done){
            (function hasFinished(){
                if(handler.calledTwice){
                    done();
                } else {
                    setTimeout(hasFinished, 10);
                }
            })();
        });

        it('processes the jobs in the correct order', function(){
            assert.equal(handler.args[0][0].data, 'priority-2');
            assert.equal(handler.args[1][0].data, 'priority-1');
        });
    });
});
