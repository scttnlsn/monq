var assert = require('assert');
var sinon = require('sinon');
var Queue = require('../lib/queue');
var Worker = require('../lib/worker');

describe('Worker', function() {
    var worker;

    beforeEach(function() {
        worker = new Worker();
    });

    it('has default queue', function() {
        assert.equal(worker.queues.length, 1);
        assert.equal(worker.queues[0].name, 'default');
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

    describe('when publishing events', function() {
        var job;

        beforeEach(function() {
            var pubsub = { publish: function() {}};
            worker = new Worker({ pubsub: pubsub });
            job = { queue: 'default' };
        });

        it('emits event on object', function(done) {
            worker.on('foo', function(j) {
                assert.equal(j, job);
                done();
            });

            worker.publish('foo', job);
        });

        it('publishes event to pubsub bus', function() {
            var publish = sinon.stub(worker.pubsub, 'publish');

            worker.publish('foo', job);

            assert.ok(publish.calledOnce);
            assert.deepEqual(publish.getCall(0).args[0], {
                event: 'foo',
                queue: 'default',
                job: job
            });
        });
    });

    describe('when dequeuing', function() {
        beforeEach(function() {
            worker = new Worker({ queues: ['foo', 'bar', 'baz'] });
        });

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
        beforeEach(function() {
            worker = new Worker({ queues: ['foo', 'bar'] });
        });

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
            var job, work;

            beforeEach(function() {
                job = { some: 'job' };
                work = sinon.stub(worker, 'work');
                sinon.stub(worker.queues[0], 'dequeue').yields(null, job);
            });

            it('works on the job', function() {
                worker.start();

                assert.ok(work.calledOnce);
                assert.equal(work.getCall(0).args[0], job);
            });

            it('publishes `dequeued` event', function() {
                var publish = sinon.spy(worker, 'publish');

                worker.start();

                assert.ok(publish.calledOnce);
                var args = publish.getCall(0).args;
                assert.equal(args[0], 'dequeued');
                assert.equal(args[1], job);
            });
        });

        describe('when no job is available', function() {
            var clock;

            beforeEach(function() {
                clock = sinon.useFakeTimers();
                sinon.stub(worker.queues[0], 'dequeue').yields(null, null);
                sinon.stub(worker.queues[1], 'dequeue').yields(null, null);
            });

            afterEach(function() {
                clock.restore();
            });

            it('waits an interval before polling again', function() {
                worker.start();

                var poll = sinon.spy(worker, 'poll');
                worker.stop();
                clock.tick(5000);

                assert.ok(poll.calledOnce);
            });
        });
    });

    describe('when working', function() {
        describe('when processing fails', function() {
            var error, fail, job, poll;

            beforeEach(function() {
                error = new Error();
                job = { fail: function() {}};
                fail = sinon.stub(job, 'fail').yields();
                poll = sinon.spy(worker, 'poll');

                sinon.stub(worker, 'process').yields(error);
            });

            it('fails the job', function() {
                worker.work(job);

                assert.ok(fail.calledOnce);
                assert.equal(fail.getCall(0).args[0], error)
            });

            it('publishes `failed` event', function() {
                var publish = sinon.spy(worker, 'publish');

                worker.work(job);

                assert.ok(publish.calledOnce);
                assert.equal(publish.getCall(0).args[0], 'failed');
                assert.equal(publish.getCall(0).args[1], job);
            });

            it('polls for a new job', function() {
                worker.work(job);

                assert.ok(poll.calledOnce);
            });
        });

        describe('when processing succeeds', function() {
            var complete, job, poll;

            beforeEach(function() {
                job = { complete: function() {}};
                complete = sinon.stub(job, 'complete').yields();
                poll = sinon.spy(worker, 'poll');

                sinon.stub(worker, 'process').yields(null, 'foobar');
            });

            it('completes the job', function() {
                worker.work(job);

                assert.ok(complete.calledOnce);
                assert.equal(complete.getCall(0).args[0], 'foobar')
            });

            it('publishes `complete` event', function() {
                var publish = sinon.spy(worker, 'publish');

                worker.work(job);

                assert.ok(publish.calledOnce);
                assert.equal(publish.getCall(0).args[0], 'complete');
                assert.equal(publish.getCall(0).args[1], job);
            });

            it('polls for a new job', function() {
                worker.work(job);

                assert.ok(poll.calledOnce);
            });
        });
    });

    describe('when processing', function() {
        beforeEach(function() {
            worker = new Worker();

            worker.register({
                example: function(job, callback) {
                    callback(null, 'foobar');
                }
            });
        });

        it('passes job to registered callback', function(done) {
            worker.process({ name: 'example' }, function(err, result) {
                assert.equal(result, 'foobar');
                done();
            });
        });
    });
});