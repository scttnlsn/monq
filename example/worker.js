var monq = require('../lib/index');

var client = monq(process.env.MONGODB_URI || 'mongodb://localhost:27017/monq_example', { safe: true });
var worker = client.worker(['foo']);

worker.register({ uppercase: require('./uppercase') });

worker.on('dequeued', function(data) {
    console.log('Dequeued:');
    console.log(data);
});

worker.on('failed', function(data) {
    console.log('Failed:');
    console.log(data);
});

worker.on('complete', function(data) {
    console.log('Complete:');
    console.log(data);
});

worker.on('error', function(err) {
    console.log('Error:');
    console.log(err);
    worker.stop();
});

worker.start();