var assert = require('assert');
var mongoose = require('mongoose');
var Job = require('../lib/job');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_tests');

describe('Job', function() {
    describe('when enqueueing', function() {
        var job;

        beforeEach(function(done) {
            Job.enqueue('foo', { bar: 'baz' }, 'qux', function(err, instance) {
                if (err) return done(err);
                job = instance;
                done();
            });
        });

        it('has a name', function() {
            assert.equal(job.name, 'foo');
        });

        it('has a queue', function() {
            assert.equal(job.queue, 'qux');
        });

        it('has params', function() {
            assert.deepEqual(job.params, { bar: 'baz' });
        });

        it('has an enqueued date', function() {
            assert.ok(job.enqueued < Date.now());
        });

        it('has `queued` status', function() {
            assert.equal(job.status, 'queued');
        });
    });
});