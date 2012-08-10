monq
====

Monq is a MongoDB-backed job queue for Node.js.

Usage
-----

Connect to MongoDB by specifying a URI or providing `host`, `port` and `database` options:

```javascript
var monq = require('monq');
var client = monq('mongodb://localhost:27017/monq_example');
```
    
Enqueue jobs by supplying a job name and a set of parameters.  Below, the job `reverse` is being placed into the `example` queue:

```javascript
var queue = client.queue('example');

queue.enqueue('reverse', { text: 'foobar' }, function(err, job) {
    console.log('enqueued:', job._id);
});
```

Create workers to process the jobs from one or more queues.  The functions responsible for performing a job must be registered with each worker:

```javascript
var worker = client.worker({ queues: ['example'] });

worker.register({
    reverse: function(params, callback) {
        try {
            var reversed = params.text.split('').reverse().join('');
            callback(null, reversed);
        } catch (err) {
            callback(err);
        }
    }
});

worker.start();
```
    
Workers emit various events while processing jobs:

```javascript
worker.on('dequeued', function(job) { … });
worker.on('fail', function(job) { … });
worker.on('complete', function(job) { … });
worker.on('error', function(err) { … });
```
    
Pub/sub
-------

Monq uses [Mubsub](http://github.com/scttnlsn/mubsub) to publish and subscribe to worker updates via MongoDB's capped collections and tailable cursors.  This allows one to monitor the state of a job as it is being handled by a worker in another process.  Subscribe to job updates by supplying a job id:

```javascript
client.subscribe(id, function(info) {
    console.log(info.job);
});
```
    
API
---

More detailed API docs soon.
    
Install
-------

    npm install monq
    
Tests
-----
    make test

You can optionally specify the MongoDB URI to be used for tests:

    MONGODB_URI=mongodb://localhost:27017/monq_tests make test