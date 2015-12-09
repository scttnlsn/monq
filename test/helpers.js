var async = require('async');
var mongo = require('mongojs');

exports.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_tests';

exports.db = mongo(exports.uri, [], { safe: true });

exports.each = function (fixture, fn, done) {
    async.each(fixture, function (args, callback) {
        fn.apply(undefined, args.concat([callback]));
    }, done);
};

exports.flushWorker = function (worker, done) {
    worker.start();
    worker.once('empty', function () {
        worker.stop(done);
    });
};