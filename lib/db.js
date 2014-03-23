exports.index = function (collection) {
    // Drop old indexes

    collection.indexExists('status_1_queue_1_enqueued_1', function (err, indexes) {
        if (err) console.error(err);

        if (indexes === true) {
            collection.dropIndex('status_1_queue_1_enqueued_1', function (err, result) {
                if (err) console.error(err);
            });
        }
    });

    collection.indexExists('status_1_queue_1_enqueued_1_delay_1', function (err, indexes) {
        if (err) console.error(err);

        if (indexes === true) {
            collection.dropIndex('status_1_queue_1_enqueued_1_delay_1', function (err, result) {
                if (err) console.error(err);
            });
        }
    });

    // Ensures there's a reasonable index for the poling dequeue
    // Status is first b/c querying by status = queued should be very selective

    collection.ensureIndex({ status: 1, queue: 1, priority: 1, _id: 1, delay: 1 }, function (err) {
        if (err) console.error(err);
    });
};