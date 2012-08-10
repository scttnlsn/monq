var monq = require('../lib/index');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example');
var queue = client.queue('foo');

queue.enqueue('uppercase', { text: 'bar' }, function(err, job) {
    if (err) throw err;

    job.on('status', function(data) {
        console.log(data);
    });
});