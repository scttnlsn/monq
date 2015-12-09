var assert = require('assert');
var helpers = require('./helpers');
var Job = require('../lib/job');

describe('Job', function () {
    var collection;

    beforeEach(function () {
        collection = helpers.db.collection('jobs');
    });

    afterEach(function (done) {
        collection.remove({}, done);
    });

    it('has data object', function () {
        var job = new Job(collection, { foo: 'bar' });
        assert.deepEqual(job.data, { foo: 'bar' });
    });

    describe('when saving', function () {
        var job;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar' });
            job.save(done);
        });

        it('has an `_id`', function () {
            assert.ok(job.data._id);
            assert.equal(job.data.foo, 'bar');
        });

        it('is inserted into collection', function (done) {
            collection.findOne({ _id : job.data._id }, function (err, doc) {
                if (err) return done(err);

                assert.ok(doc);
                assert.equal(doc._id.toString(), job.data._id.toString());
                assert.equal(doc.foo, job.data.foo);
                done();
            });
        });

        it('contains a string id', function (done) {
            collection.findOne({ _id : job.data._id }, function (err, doc) {
                if (err) return done(err);

                assert.equal(doc._id.toString(), job.data.id);
                done();
            });
        });
    });

    describe('when updating', function () {
        var job;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar' });
            job.save(function (err) {
                if (err) return done(err);

                assert.equal(job.data.foo, 'bar');
                
                job.data.foo = 'baz';
                job.save(done);
            });
        });

        it('has udpated data', function () {
            assert.equal(job.data.foo, 'baz');
        });
    });

    describe('when completing', function () {
        var job;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar' });
            job.complete({ bar: 'baz' }, done);
        });

        it('has a complete status', function () {
            assert.equal(job.data.status, 'complete');
        });

        it('has an end time', function () {
            assert.ok(job.data.ended <= new Date());
        });

        it('has a result', function () {
            assert.deepEqual(job.data.result, { bar: 'baz' });
        });
    });

    describe('when failing', function () {
        var job;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar' });
            job.fail(new Error('baz'), done);
        });

        it('has a failed status', function () {
            assert.equal(job.data.status, 'failed');
        });

        it('has an end time', function () {
            assert.ok(job.data.ended);
            assert.ok(job.data.ended <= new Date());
        });

        it('has an error', function () {
            assert.ok(job.data.error);
            assert.equal(job.data.error, 'baz');
        });

        it('has a stack', function () {
            assert.ok(job.data.stack);
        });
    });

    describe('when cancelling a queued job', function () {
        var job, save;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar', status: 'queued' });
            job.cancel(done);
        });

        it('is cancelled', function () {
            assert.equal(job.data.status, 'cancelled');
        });
    });

    describe('when cancelling a complete job', function () {
        var job, error;

        beforeEach(function (done) {
            job = new Job(collection, { foo: 'bar', status: 'complete' });
            job.cancel(function (err) {
                error = err;
                done();
            });
        });

        it('is returns error', function () {
            assert.equal(job.data.status, 'complete');
            assert.equal(error.message, 'Only queued jobs may be cancelled');
        });
    });
});