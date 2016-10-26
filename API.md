## Classes

<dl>
<dt><a href="#Connection">Connection</a></dt>
<dd></dd>
<dt><a href="#Job">Job</a></dt>
<dd></dd>
<dt><a href="#Worker">Worker</a></dt>
<dd></dd>
</dl>

<a name="Connection"></a>

## Connection
**Kind**: global class  

* [Connection](#Connection)
    * [new Connection(uri, options)](#new_Connection_new)
    * [.worker(queues, options)](#Connection+worker)

<a name="new_Connection_new"></a>

### new Connection(uri, options)

| Param | Type | Description |
| --- | --- | --- |
| uri | <code>string</code> | MongoDB connection string |
| options | <code>Object</code> | connection options |

<a name="Connection+worker"></a>

### connection.worker(queues, options)
Returns a new [Worker](#Worker)

**Kind**: instance method of <code>[Connection](#Connection)</code>  

| Param | Type | Description |
| --- | --- | --- |
| queues | <code>Array.&lt;string&gt;</code> &#124; <code>string</code> | list of queue names, a single queue name, or '*' for a universal worker |
| options | <code>Object</code> | an object with worker options |

<a name="Job"></a>

## Job
**Kind**: global class  

* [Job](#Job)
    * [new Job(collection, data)](#new_Job_new)
    * [~Attempts](#Job..Attempts) : <code>Object</code>

<a name="new_Job_new"></a>

### new Job(collection, data)

| Param | Type | Description |
| --- | --- | --- |
| collection | <code>string</code> | The collection to save the job to |
| data | <code>Object</code> | The Job data |

<a name="Job..Attempts"></a>

### Job~Attempts : <code>Object</code>
Job retry specification

**Kind**: inner typedef of <code>[Job](#Job)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| strategy | <code>string</code> | Name of [Worker~strategyCallback](Worker~strategyCallback) to use on retry |
| count | <code>number</code> | total number of attempts so far |
| delay | <code>number</code> | a delay constant for use in determining a delay.  In default linear strategy, this will be the delay between attempts |

<a name="Worker"></a>

## Worker
**Kind**: global class  

* [Worker](#Worker)
    * [new Worker(queues, options)](#new_Worker_new)
    * _instance_
        * [.register(callbacks)](#Worker+register)
        * [.start()](#Worker+start)
        * [.stop()](#Worker+stop)
        * [.addQueue(queue)](#Worker+addQueue)
    * _inner_
        * [~Options](#Worker..Options) : <code>Object</code>
        * [~Callback](#Worker..Callback) : <code>function</code>
        * [~Strategies](#Worker..Strategies) : <code>Object</code>
        * [~StrategyCallback](#Worker..StrategyCallback) ⇒ <code>Number</code>

<a name="new_Worker_new"></a>

### new Worker(queues, options)

| Param | Type | Description |
| --- | --- | --- |
| queues | <code>Array.&lt;string&gt;</code> | an array of queue names that this worker will listen for |
| options | <code>[Options](#Worker..Options)</code> | [Options](#Worker..Options) Options object |

<a name="Worker+register"></a>

### worker.register(callbacks)
Sets handlers to be invoked for each queue that the worker is listening to

**Kind**: instance method of <code>[Worker](#Worker)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callbacks | <code>Object</code> | map of [Callback](#Worker..Callback) objects. Keys are the name of the queue, values are the handlers for those queues |

<a name="Worker+start"></a>

### worker.start()
Starts the worker.  If no queues have been specified yet, this will loop

**Kind**: instance method of <code>[Worker](#Worker)</code>  
<a name="Worker+stop"></a>

### worker.stop()
Stops the worker

**Kind**: instance method of <code>[Worker](#Worker)</code>  
<a name="Worker+addQueue"></a>

### worker.addQueue(queue)
Adds a queue for the worker to listen on

**Kind**: instance method of <code>[Worker](#Worker)</code>  

| Param | Type | Description |
| --- | --- | --- |
| queue | <code>string</code> | the name of the queue to add |

<a name="Worker..Options"></a>

### Worker~Options : <code>Object</code>
Options for a new worker

**Kind**: inner typedef of <code>[Worker](#Worker)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| interval | <code>Number</code> | the polling interval for the worker. Note: The worker will process jobs, one at a time, as fast as possible while queues have waiting jobs |
| strategies | <code>[Strategies](#Worker..Strategies)</code> | [Strategies](#Worker..Strategies) for retrying jobs |
| callbacks | <code>Worker~Callbacks</code> | Map of [Callback](#Worker..Callback) for processing jobs |
| minPriority | <code>Number</code> | The lowest job priority the worker will process |

<a name="Worker..Callback"></a>

### Worker~Callback : <code>function</code>
Job handler functions should take this form

**Kind**: inner typedef of <code>[Worker](#Worker)</code>  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Job.params</code> | [Job.params](Job.params) object for the job to be processed |
| callback | <code>function</code> | NodeJS style callback to be invoked when job processing is finished |

<a name="Worker..Strategies"></a>

### Worker~Strategies : <code>Object</code>
A map of [StrategyCallback](#Worker..StrategyCallback)s

**Kind**: inner typedef of <code>[Worker](#Worker)</code>  
<a name="Worker..StrategyCallback"></a>

### Worker~StrategyCallback ⇒ <code>Number</code>
**Kind**: inner typedef of <code>[Worker](#Worker)</code>  
**Returns**: <code>Number</code> - delay time  

| Param | Type | Description |
| --- | --- | --- |
| attempts | <code>[Attempts](#Job..Attempts)</code> | [Attempts](#Job..Attempts) object |

