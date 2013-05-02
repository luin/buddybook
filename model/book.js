var mongoose = require('mongoose');
var uuid = require('node-uuid');

var bookSchema = mongoose.Schema({
  uniqueID: {type: String, default: uuid.v4,
            index: {unique: true, dropDups: true}},
  owner: String,
  ownerTitle: String,
  participant: String,
  participantTitle: String,
  lastUpdateTime: {type: Number, default: 0}
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

bookSchema.method('fetch', function (user) {
  var obj = this.toObject();
  obj.isOwner = obj.owner === user.uniqueID;
  obj.isLinked = Boolean(obj.participant);
  delete obj.owner;
  delete obj.participant;
  return obj;
});

bookSchema.method('unreadCount', function (userUniqueId, callback) {
  var Deal = mongoose.model('Deal');
  var isOwner = this.owner === userUniqueId;
  if (isOwner) {
    Deal.count({book: this.uniqueID, ownerRead: false}, callback);
  } else {
    Deal.count({book: this.uniqueID, participantRead: false}, callback);
  }
});

mongoose.model('Book', bookSchema);

