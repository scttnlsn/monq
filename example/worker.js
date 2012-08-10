var monq = require('../lib/index');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example');
var worker = client.worker(['foo']);

worker.register({ uppercase: require('./uppercase') });

worker.on('dequeued', function(job) {
    console.log('Dequeued:');
    console.log(job);
});

worker.on('failed', function(job) {
    console.log('Failed:');
    console.log(job);
});

worker.on('complete', function(job) {
    console.log('Complete:');
    console.log(job);
});

worker.on('error', function(err) {
    console.log('Error:');
    console.log(err);
    worker.stop();
});

worker.start();