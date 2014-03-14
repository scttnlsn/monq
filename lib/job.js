var events = require('events');
var util = require('util');

module.exports = Job;

function Job(collection, data) {
    this.collection = collection;
    if(data){
        data.__proto__ = JobData.prototype; //Convert plain object to JobData type
        this.data = data;
    } else {
        this.data = new JobData();
    }
}

util.inherits(Job, events.EventEmitter);

Job.prototype.save = function(callback) {
    var self = this;
    
    this.collection.save(this.data, function(err, doc) {
        if (err) return callback(err);

        if (doc && self.data._id === undefined) self.data._id = doc._id;

        callback(null, self);
    });
};

Job.prototype.cancel = function(callback){
    if(this.data.status === 'queued'){
        this.data.status = 'cancelled';
        this.data.ended = new Date();
        this.save(callback);
    } else {
        callback(new Error('Only queued jobs may be cancelled'));
    }
};

Job.prototype.complete = function(result, callback) {
    this.data.status = 'complete';
    this.data.ended = new Date();
    this.data.result = result;
    this.save(callback);
};

Job.prototype.fail = function(error, callback) {
    var attempts = this.data.attempts;

    if(attempts){
        attempts.attemptsLeft = (attempts.attemptsLeft || attempts.count) - 1;

        if(attempts.attemptsLeft > 0){
            this.data.status = 'queued';
            var offset = 0;

            if(attempts.delayMS != null){
                switch(attempts.delayStrategy){
                    case 'exponential':
                        offset = attempts.delayMS * (attempts.count - attempts.attemptsLeft);
                        break;
                    default:
                        offset = attempts.delayMS;
                        break;
                }
            }

            this.data.delay = new Date(new Date().getTime() + offset);
        } else {
            this.data.status = 'failed';
        }
    } else {
        this.data.status = 'failed';
    }

    this.data.ended = new Date();
    this.data.error = error && error.message || error;

    if(error && error.stack){
        this.data.stack = error.stack;
    }

    this.save(callback);
};

function JobData() {}

Object.defineProperty(JobData.prototype, 'id', {
    get: function(){
        return this._id && this._id.toString && this._id.toString();
    }
});
