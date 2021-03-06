/*jslint indent: 2, maxlen: 80, sloppy: true */
/*global command: true */
var putCommand = function (spec, my) {
  var that = command(spec, my);
  spec = spec || {};
  my = my || {};

  // Methods //
  that.getLabel = function () {
    return 'put';
  };

  that.validateState = function () {
    if (!(typeof that.getDocId() === "string" && that.getDocId() !==
        "")) {
      that.error({
        "status": 20,
        "statusText": "Document Id Required",
        "error": "document_id_required",
        "message": "The document id is not provided",
        "reason": "Document id is undefined"
      });
      return false;
    }
    return true;
  };
  that.executeOn = function (storage) {
    storage.put(that);
  };
  return that;
};
