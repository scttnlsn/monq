var mongoose = require('mongoose');

exports.connect = function() {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_tests');
};