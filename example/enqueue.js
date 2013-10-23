var monq = require('../lib/index');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example', { safe: true });
var queue = client.queue('foo');

queue.enqueue('uppercase', { text: 'bar' }, function(err, job) {
    if (err) throw err;
    console.log('Enqueued:', job.data);
    process.exit();
});