var assert = require('assert');
var sinon = require('sinon');
var Job = require('../lib/job');
var Queue = require('../lib/queue');

describe('Queue', function() {
    var queue;

    beforeEach(function() {
        queue = new Queue('qux');
    });

    it('enqueues jobs', function(done) {
        var spy = sinon.stub(Job, 'enqueue').yields();

        queue.enqueue('foo', { bar: 'baz' }, function(err, job) {
            if (err) return done(err);

            assert.ok(spy.calledOnce);
            var args = spy.getCall(0).args;

            assert.equal(args[0], 'foo');
            assert.deepEqual(args[1], { bar: 'baz' });
            assert.equal(args[2], 'qux');
            done();
        });
    });

    it('dequeues jobs', function(done) {
        var spy = sinon.stub(Job, 'dequeue').yields();

        queue.dequeue(function(err) {
            if (err) return done(err);

            assert.ok(spy.calledOnce);
            var args = spy.getCall(0).args;

            assert.equal(args[0], 'qux');
            done();
        });
    });
});