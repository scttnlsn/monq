var monq = require('../lib/index');

monq.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example');

var queue = monq.queue('foo');

queue.enqueue('uppercase', { text: 'bar' }, function(err, job) {
    if (err) throw err;

    monq.subscribe(job._id, function(err, info) {
        if (err) throw err;
        console.log(info);
    });
});