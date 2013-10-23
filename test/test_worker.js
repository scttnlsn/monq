var assert = require('assert');
var sinon = require('sinon');
var Worker = require('../lib/worker');

describe('Worker', function() {
    var job, queues, worker;

    beforeEach(function() {
        job = {
            data: {},
            complete: function() {},
            fail: function() {}
        };

        queues = ['foo', 'bar', 'baz'].map(function(name) {
            return {
                enqueue: function() {},
                dequeue: function() {}
            };
        });

        worker = new Worker(queues);
    });

    it('has default polling interval', function() {
        assert.equal(worker.interval, 5000);
    });

    it('is an event emitter', function(done) {
        worker.on('foo', function(bar) {
            assert.equal(bar, 'bar');
            done();
        });

        worker.emit('foo', 'bar');
    });

    describe('when dequeuing', function() {
        it('cycles queues', function() {
            var foo = sinon.stub(worker.queues[0], 'dequeue').yields();
            var bar = sinon.stub(worker.queues[1], 'dequeue').yields();
            var baz = sinon.stub(worker.queues[2], 'dequeue').yields();

            worker.dequeue(function() {});
            worker.dequeue(function() {});
            worker.dequeue(function() {});
            worker.dequeue(function() {});

            assert.ok(foo.calledTwice);
            assert.ok(foo.calledBefore(bar));
            assert.ok(bar.calledOnce);
            assert.ok(bar.calledBefore(baz));
            assert.ok(baz.calledOnce);
            assert.ok(baz.calledBefore(foo));
        });
    });

    describe('when polling', function() {
        describe('when error', function() {
            it('emits an `error` event', function(done) {
                var error = new Error();
                
                sinon.stub(worker, 'dequeue').yields(error);

                worker.on('error', function(err) {
                    assert.equal(err, error);
                    done();
                });

                worker.start();
            });
        });

        describe('when job is available', function() {
            var work;

            beforeEach(function() {
                work = sinon.stub(worker, 'work');

                sinon.stub(worker.queues[0], 'dequeue').yields(null, job);
            });

            it('works on the job', function() {
                worker.start();

                assert.ok(work.calledOnce);
                assert.equal(work.getCall(0).args[0], job);
            });

            it('emits `dequeued` event', function(done) {
                worker.on('dequeued', function(j) {
                    assert.equal(j, job.data);
                    done();
                });

                worker.start();
            });
        });

        describe('when no job is available', function() {
            var clock;

            beforeEach(function() {
                clock = sinon.useFakeTimers();

                sinon.stub(worker.queues[0], 'dequeue').yields(null, null);
                sinon.stub(worker.queues[1], 'dequeue').yields(null, null);
                sinon.stub(worker.queues[2], 'dequeue').yields(null, null);
            });

            afterEach(function() {
                clock.restore();
            });

            it('waits an interval before polling again', function() {
                worker.start();

                var poll = sinon.spy(worker, 'poll');
                worker.stop();
                clock.tick(worker.interval);

                assert.ok(poll.calledOnce);
            });
        });
    });

    describe('when working', function() {
        describe('when processing fails', function() {
            var error, fail, poll;

            beforeEach(function() {
                error = new Error();
                
                fail = sinon.stub(job, 'fail').yields();
                poll = sinon.spy(worker, 'poll');

                sinon.stub(worker, 'process').yields(error);
            });

            it('fails the job', function() {
                worker.work(job);

                assert.ok(fail.calledOnce);
                assert.equal(fail.getCall(0).args[0], error)
            });

            it('emits `failed` event', function(done) {
                worker.on('failed', function(data) {
                    assert.equal(data, job.data);
                    done();
                });

                worker.work(job);
            });

            it('polls for a new job', function() {
                worker.work(job);

                assert.ok(poll.calledOnce);
            });
        });

        describe('when processing succeeds', function() {
            var complete, poll;

            beforeEach(function() {
                complete = sinon.stub(job, 'complete').yields();
                poll = sinon.spy(worker, 'poll');

                sinon.stub(worker, 'process').yields(null, 'foobar');
            });

            it('completes the job', function() {
                worker.work(job);

                assert.ok(complete.calledOnce);
                assert.equal(complete.getCall(0).args[0], 'foobar')
            });

            it('emits `complete` event', function(done) {
                worker.on('complete', function(data) {
                    assert.equal(data, job.data);
                    done();
                });

                worker.work(job);
            });

            it('polls for a new job', function() {
                worker.work(job);

                assert.ok(poll.calledOnce);
            });
        });
    });

    describe('when processing', function() {
        beforeEach(function() {
            worker.register({
                example: function(params, callback) {
                    callback(null, params);
                }
            });
        });

        it('passes job to registered callback', function(done) {
            worker.process({ name: 'example', params: { foo: 'bar' }}, function(err, result) {
                assert.deepEqual(result, { foo: 'bar' });
                done();
            });
        });

        it('returns error if there is no registered callback', function(done) {
            worker.process({ name: 'asdf' }, function(err, result) {
                assert.ok(err);
                done();
            });
        });
    });
});