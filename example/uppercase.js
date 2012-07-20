module.exports = function(job, callback) {
    // Pretend this is a long running job
    // by setting a 3 second timeout
    setTimeout(function() {
        var uppercase = job.params.text.toUpperCase();
        callback(null, uppercase);
    }, 3000);
};