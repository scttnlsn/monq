var mongo = require('mongoskin');

exports.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_tests';

exports.db = mongo.db(exports.uri, { safe: true });