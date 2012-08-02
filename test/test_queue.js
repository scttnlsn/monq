var assert = require('assert');
var sinon = require('sinon');
var Queue = require('../lib/queue');

var jobs = {
    enqueue: function() {},
    dequeue: function() {}
};

describe('Queue', function() {
    var queue;

    beforeEach(function() {
        queue = new Queue('qux', jobs);
    });

    it('enqueues jobs', function(done) {
        var spy = sinon.stub(jobs, 'enqueue').yields();

        queue.enqueue('foo', { bar: 'baz' }, function(err, job) {
            if (err) return done(err);

            assert.ok(spy.calledOnce);
            var args = spy.getCall(0).args;

            assert.equal(args[0], 'foo');
            assert.deepEqual(args[1], { bar: 'baz' });
            assert.equal(args[2], 'qux');
            spy.restore();
            done();
        });
    });

    it('dequeues jobs', function(done) {
        var spy = sinon.stub(jobs, 'dequeue').yields();

        queue.dequeue(function(err) {
            if (err) return done(err);

            assert.ok(spy.calledOnce);
            var args = spy.getCall(0).args;

            assert.equal(args[0], 'qux');
            spy.restore();
            done();
        });
    });
});