var mongoose = require('mongoose');
var mubsub = require('mubsub');

exports.connect = function() {
    var db = process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_tests';
    
    mongoose.connect(db);

    if (mubsub.connection.readyState === 0) {
        mubsub.connect(db);
    }
};