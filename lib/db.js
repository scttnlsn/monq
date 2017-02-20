exports.index = function (collection) {
    collection.getIndexes(function(err, indexes) {
        if (err) {
            if (err.code === 26) { 
                // MongoError: no collection
                return;
            } 
            return console.log(err);
        }

        dropIndex('status_1_queue_1_enqueued_1');
        dropIndex('status_1_queue_1_enqueued_1_delay_1');

        function dropIndex(name) {
            if (indexes.some(function(index) { return index.name == name; })) {
                collection.dropIndex(name, function(err) {
                    if (err) { console.error(err); }
                });
            }
        }
    });

    // Ensures there's a reasonable index for the poling dequeue
    // Status is first b/c querying by status = queued should be very selective
    collection.ensureIndex({ status: 1, queue: 1, priority: -1, _id: 1, delay: 1 }, function (err) {
        if (err) console.error(err);
    });
};
