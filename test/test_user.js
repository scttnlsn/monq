var assert = require('assert');
var helpers = require('./helpers');
var User = require('../lib/user');

describe('User', function() {
    before(function() {
        helpers.connect();
    });

    var user;

    beforeEach(function(done) {
        user = new User({ description: 'bar baz', permissions: [{ job: 'foo', queue: 'qux' }] });
        user.save(done);
    });

    it('has a token', function() {
        assert.ok(user.token);
    });

    it('has permissions', function() {
        assert.ok(!user.allowed('foo', 'qux'));
        assert.ok(user.allowed('qux', 'foo'));
    });
});