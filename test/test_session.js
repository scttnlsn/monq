var assert = require('assert');
var sinon = require('sinon');
var helpers = require('./helpers');
var Session = require('../lib/session');
var User = require('../lib/user');

helpers.connect();

describe('Session', function() {
    var user;

    beforeEach(function(done) {
        user = new User({
            description: 'test user',
            permissions: [{ queue: 'default', job: 'foo' }]
        });

        user.save(done);
    });

    it('is an event emitter', function(done) {
        var session = new Session();

        session.on('foo', function(bar) {
            assert.equal(bar, 'bar');
            done();
        });

        session.emit('foo', 'bar');
    });

    describe('when token is invalid', function() {
        var session;

        beforeEach(function() {
            session = new Session('foo');
        });

        it('jobs cannot be enqueued', function(done) {
            session.enqueue('default', 'foo', { bar: 'baz' }, function(err) {
                assert.ok(err);
                done();
            });
        });
    });

    describe('when token is valid', function() {
        var session;

        beforeEach(function() {
            session = new Session(user.token);
        });

        it('rejects unauthorized jobs', function(done) {
            session.enqueue('asdf', 'foo', { bar: 'baz' }, function(err) {
                assert.ok(err);
                done();
            });
        });

        it('enqueues authorized jobs', function(done) {
            session.enqueue('default', 'foo', { bar: 'baz' }, function(err, job) {
                assert.ok(!err);
                assert.ok(job);
                done();
            });
        });

        it('listens for changes to enqueued jobs', function(done) {
            var id;

            session.on('status', function(doc) {
                assert.ok(doc);
                assert.equal(doc.job._id.toString(), id.toString());
                done();
            });

            session.enqueue('default', 'foo', { bar: 'baz' }, function(err, job) {
                id = job._id;
                session.pubsub.publish({ job: job.toObject() });
            });
        });
    });
});