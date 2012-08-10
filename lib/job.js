module.exports = Job;

function Job(collection, data) {
    this.collection = collection;
    this.data = data || {};
}

Job.prototype.save = function(callback) {
    var self = this;
    
    this.collection.save(this.data, function(err, doc) {
        if (err) return callback(err);

        if (doc) self.data = doc;
        callback(null, self);
    });
};

Job.prototype.complete = function(result, callback) {
    this.data.status = 'complete';
    this.data.ended = Date.now();
    this.data.result = result;
    this.save(callback);
};

Job.prototype.fail = function(error, callback) {
    this.data.status = 'failed';
    this.data.ended = Date.now();
    this.data.error = error.message;
    this.save(callback);
};