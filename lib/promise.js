module.exports = Promise;

function Promise(context) {
    this.context = context || this;
    this.callbacks = [];
}

Promise.prototype.then = function(callback) {
    if (this.resolved !== undefined) {
        callback.apply(this.context, this.resolved);
    } else {
        this.callbacks.push(callback);
    }
};

Promise.prototype.resolve = function() {
    if (this.resolved !== undefined) {
        throw new Error('Promise already resolved');
    }

    var self = this;

    this.resolved = arguments;
    this.callbacks.forEach(function(callback) {
        callback.apply(self.context, self.resolved);
    });
};