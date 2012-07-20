var monq = require('../lib/index');

monq.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example');

var worker = monq.worker({ queues: ['foo', 'bar'], path: ['.', 'example'] });

worker.on('dequeued', function(job) {
    console.log('dequeued', job._id);
});

worker.on('failed', function(job) {
    console.log('failed', job._id);
});

worker.on('complete', function(job) {
    console.log('complete', job._id, job.result);
});

worker.on('error', function(err) {
    console.log(err);
    worker.stop();
});

worker.start();