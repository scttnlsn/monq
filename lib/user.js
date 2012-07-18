var mongoose = require('mongoose');
var uuid = require('node-uuid');

var Permission = new mongoose.Schema({
    job: { type: String, required: true },
    queue: { type: String, required: true }
});

var User = new mongoose.Schema({
    token: { type: String, required: true },
    description: { type: String },
    permissions: [Permission]
});

User.pre('validate', function(next) {
    if (this.isNew) {
        this.token = uuid.v4();
    }

    next();
});

User.methods.allowed = function(queue, job) {
    var permissions = this.permissions.filter(function(permission) {
        return permission.queue === queue && permission.job === job;
    });

    return permissions.length > 0;
};

module.exports = mongoose.model('User', User);