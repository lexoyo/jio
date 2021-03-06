/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global spec: true, localstorage: true,
         activityUpdater: true, jobManager: true, storage: true,
         storage_type_object: true, invalidStorageType: true, jobRules: true,
         job: true, postCommand: true, putCommand: true, getCommand:true,
         allDocsCommand: true, putAttachmentCommand: true,
         getAttachmentCommand: true, removeAttachmentCommand: true,
         removeCommand: true, checkCommand: true, repairCommand: true */
// Class jio
var that = {}, priv = {}, jio_id_array_name = 'jio/id_array';
spec = spec || {};
// Attributes //
priv.id = null;

priv.storage_spec = spec;

priv.environments = {};

// initialize //
priv.init = function () {
  // Initialize the jio id and add the new id to the list
  if (priv.id === null) {
    var i, jio_id_a =
      localstorage.getItem(jio_id_array_name) || [];
    priv.id = 1;
    for (i = 0; i < jio_id_a.length; i += 1) {
      if (jio_id_a[i] >= priv.id) {
        priv.id = jio_id_a[i] + 1;
      }
    }
    jio_id_a.push(priv.id);
    localstorage.setItem(jio_id_array_name, jio_id_a);
    activityUpdater.setId(priv.id);
    jobManager.setId(priv.id);
  }
};

// Methods //
/**
 * Returns a storage from a storage description.
 * @method storage
 * @param  {object} spec The specifications.
 * @param  {object} my The protected object.
 * @param  {string} forcetype Force storage type
 * @return {object} The storage object.
 */
Object.defineProperty(that, "storage", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (spec, my, forcetype) {
    var spec_str, type;
    spec = spec || {};
    my = my || {};
    my.basicStorage = storage;
    spec_str = JSON.stringify(spec);
    // environment initialization
    priv.environments[spec_str] = priv.environments[spec_str] || {};
    my.env = priv.environments[spec_str];
    my.storage = that.storage; // NOTE : or proxy storage
    type = forcetype || spec.type || 'base';
    if (type === 'base') {
      return storage(spec, my);
    }
    if (!storage_type_object[type]) {
      throw invalidStorageType({
        "type": type,
        "message": "Storage does not exists."
      });
    }
    return storage_type_object[type](spec, my);
  }
});
jobManager.storage = that.storage;

Object.defineProperty(that, "start", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    priv.init();
    activityUpdater.start();
    jobManager.start();
  }
});

Object.defineProperty(that, "stop", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    jobManager.stop();
  }
});

Object.defineProperty(that, "close", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    activityUpdater.stop();
    jobManager.stop();
    priv.id = null;
  }
});

/**
 * Returns the jio id.
 * @method getId
 * @return {number} The jio id.
 */
Object.defineProperty(that, "getId", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    return priv.id;
  }
});

/**
 * Returns the jio job rules object used by the job manager.
 * @method getJobRules
 * @return {object} The job rules object
 */
Object.defineProperty(that, "getJobRules", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    return jobRules;
  }
});

/**
 * Checks if the storage description is valid or not.
 * @method validateStorageDescription
 * @param  {object} description The description object.
 * @return {boolean} true if ok, else false.
 */
Object.defineProperty(that, "validateStorageDescription", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (description) {
    return that.storage(description).isValid();
  }
});

Object.defineProperty(that, "getJobArray", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function () {
    return jobManager.serialized();
  }
});

priv.makeCallbacks = function (param, callback1, callback2) {
  param.callback = function (err, val) {
    if (err) {
      param.error(err);
    } else {
      param.success(val);
    }
  };
  param.success = function (val) {
    param.callback(undefined, val);
  };
  param.error = function (err) {
    param.callback(err, undefined);
  };
  if (typeof callback1 === 'function') {
    if (typeof callback2 === 'function') {
      param.success = callback1;
      param.error = callback2;
    } else {
      param.callback = callback1;
    }
  } else {
    param.callback = function () {};
  }
};

priv.parametersToObject = function (list, default_options) {
  var k, i = 0, callbacks = [], param = {"options": {}};
  for (i = 0; i < list.length; i += 1) {
    if (typeof list[i] === 'object') {
      // this is the option
      param.options = list[i];
      for (k in default_options) {
        if ((typeof default_options[k]) !== (typeof list[i][k])) {
          param.options[k] = default_options[k];
        }
      }
    }
    if (typeof list[i] === 'function') {
      // this is a callback
      callbacks.push(list[i]);
    }
  }
  priv.makeCallbacks(param, callbacks[0], callbacks[1]);
  return param;
};

priv.addJob = function (commandCreator, spec) {
  jobManager.addJob(job({
    "storage": that.storage(priv.storage_spec),
    "command": commandCreator(spec)
  }));
};

/**
 * Post a document.
 * @method post
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id (optional)
 * For revision managing: choose at most one of the following informations:
 * - {string} _rev The revision we want to update
 * - {string} _revs_info The revision information we want the document to have
 * - {string} _revs The revision history we want the document to have
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "post", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 0}
    );

    priv.addJob(postCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Put a document.
 * @method put
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * For revision managing: choose at most one of the following informations:
 * - {string} _rev The revision we want to update
 * - {string} _revs_info The revision information we want the document to have
 * - {string} _revs The revision history we want the document to have
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "put", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 0}
    );

    priv.addJob(putCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Get a document.
 * @method get
 * @param  {string} doc The document object. Contains at least:
 * - {string} _id The document id
 * For revision managing:
 * - {string} _rev The revision we want to get. (optional)
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * For revision managing:
 * - {boolean} revs Include revision history of the document.
 * - {boolean} revs_info Include list of revisions, and their availability.
 * - {boolean} conflicts Include a list of conflicts.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "get", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 3}
    );

    priv.addJob(getCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Remove a document.
 * @method remove
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * For revision managing:
 * - {string} _rev The revision we want to remove
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "remove", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, callback) {
    var param = priv.parametersToObject(
      [options, success, callback],
      {max_retry: 0}
    );

    priv.addJob(removeCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Get a list of documents.
 * @method allDocs
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * - {boolean} include_docs Include document metadata
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "allDocs", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 3}
    );

    priv.addJob(allDocsCommand, {
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Get an attachment from a document.
 * @method gettAttachment
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * - {string} _attachment The attachment id
 * For revision managing:
 * - {string} _rev The document revision
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,respons)
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "getAttachment", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 3}
    );

    priv.addJob(getAttachmentCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Put an attachment to a document.
 * @method putAttachment
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * - {string} _attachment The attachment id
 * - {string} _data The attachment data
 * - {string} _mimetype The attachment mimetype
 * For revision managing:
 * - {string} _rev The document revision
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,respons)
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "putAttachment", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 0}
    );

    priv.addJob(putAttachmentCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Put an attachment to a document.
 * @method putAttachment
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * - {string} _attachment The attachment id
 * For revision managing:
 * - {string} _rev The document revision
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,respons)
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "removeAttachment", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, error) {
    var param = priv.parametersToObject(
      [options, success, error],
      {max_retry: 0}
    );

    priv.addJob(removeAttachmentCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Check a document.
 * @method check
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "check", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, callback) {
    var param = priv.parametersToObject(
      [options, success, callback],
      {max_retry: 3}
    );

    priv.addJob(checkCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});

/**
 * Repair a document.
 * @method repair
 * @param  {object} doc The document object. Contains at least:
 * - {string} _id The document id
 * @param  {object} options (optional) Contains some options:
 * - {number} max_retry The number max of retries, 0 = infinity.
 * @param  {function} callback (optional) The callback(err,response).
 * @param  {function} error (optional) The callback on error, if this
 *     callback is given in parameter, "callback" is changed as "success",
 *     called on success.
 */
Object.defineProperty(that, "repair", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: function (doc, options, success, callback) {
    var param = priv.parametersToObject(
      [options, success, callback],
      {max_retry: 3}
    );

    priv.addJob(repairCommand, {
      doc: doc,
      options: param.options,
      callbacks: {success: param.success, error: param.error}
    });
  }
});
