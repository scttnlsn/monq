//The watchdog handles jobs that have timed out due to process crashes or other catastrophic failures

var events = require('events');
var util = require('util');

function WatchDog(queue, options){
    this.queue = queue;
    this.stopped = true;

    options = options || {};
    this.options = {
        interval: options.interval || 5000,
        gracePeriod: options.gracePeriod || 10000 //Additional time to wait before timing out a job with the watch dog
    }
}

util.inherits(WatchDog, events.EventEmitter);

WatchDog.prototype.start = function(){
    var self = this;
    this.stopped = false;

    (function cleanup(){
        self.queue.getTimedOutJob(self.options.gracePeriod, function(err, job){
            if(self.stopped){
                return;
            }

            if(err){
                return self.emit(err);
            }

            if(job){
                job.fail('Timed out', function(err, job){
                    if(err){
                       return self.emit(err);
                    }

                    self.emit('timedout', job.data);
                });
            }
        });

        self.timer = setTimeout(cleanup, self.options.interval);
    })();
};

WatchDog.prototype.stop = function(){
    this.stopped = true;
    clearTimeout(this.timer);
};

module.exports = WatchDog;