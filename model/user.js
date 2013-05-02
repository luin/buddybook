var mongoose = require('mongoose');
var async = require('async');

var userSchema = mongoose.Schema({
  uniqueID: {type: String, trim: true, require: true,
           index: {unique: true, dropDups: true} },
  nickname: String,
  avatar: String,
  device: {
    type: {name: 'type', type: String},
    token: String
  }
}, {
  toObject: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret._id;
    }
  },
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret._id;
    }
  }

});

userSchema.method('unreadCount', function (callback) {
  var Account = mongoose.model('Account');
  var count = 0;
  var self = this;
  Account.find({$or: [{owner: this.uniqueID}, {participant: this.uniqueID}]},
    function (err, docs) {
      async.each(docs, function (doc, callback) {
        doc.unreadCount(self.uniqueID, function (err, c) {
          count += c;
          callback();
        });
      }, function () {
        callback(null, count);
      });
    });
});

mongoose.model('User', userSchema);
