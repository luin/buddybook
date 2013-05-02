var mongoose = require('mongoose');
var push = require('../libs/apns');

var dealSchema = mongoose.Schema({
  uniqueID: {type: String, require: true,
          index: {unique: true, dropDups: true} },
  book: String,
  amount: {type: Number, require: true},
  date: Number,
  description: String,
  ownerRead: {type: Boolean, default: false},
  participantRead: {type: Boolean, default: false},
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

var Book = mongoose.model('Book');

dealSchema.method('getUsers', function (callback) {
  Book.findOne({uniqueID: this.book}, function (err, book) {
    User.find({$or: [{uniqueID: book.owner}, {uniqueID: book.participant}]}, function (err, users) {
      var owner, participant;
      if (Array.isArray(users)) {
        users.forEach(function (user) {
          if (user.uniqueID === book.owner) {
            owner = user;
          } else {
            participant = user;
          }
        });
      }
      callback(null, owner, participant, book);
    });
  });
});

dealSchema.pre('save', function (next) {
  if (this.isNew) {
    var amount = this.amount;
    if (this.participantRead) {
      amount = -amount;
    }
    var that = this;
    this.getUsers(function (err, owner, participant, book) {
      if (book) {
        var title = book.ownerTitle;
        var user = participant;
        if (that.participantRead) {
          title = book.participantTitle;
          user = owner;
        }
        push.addDeal(user, amount, title);
      }
    });
  } else if (this.isModified('description')) {
    this.getUsers(function (err, owner, participant) {
      push.changeDescription([owner, participant]);
    });
  }
  next();
});

dealSchema.post('save', function (doc) {
  Book.update({_id: doc.book}, {lastUpdateTime: Date.now() / 1000}).exec();
});

dealSchema.post('remove', function (doc) {
  Book.update({_id: doc.book}, {lastUpdateTime: Date.now() / 1000}).exec();

  doc.getUsers(function (err, owner, participant) {
    push.deleteDeal([owner, participant]);
  });
});

var User = mongoose.model('User');
dealSchema.method('getPerson', function (me, callback) {
  var that = this;
  Book.findOne({uniqueID: this.book}, function (err, book) {
    if (me.uniqueID === book.owner) {
      User.findOne({uniqueID: book.participant}, function (err, user) {
        callback(err, user, that.amount * -1, book.participantTitle);
      });
    } else {
      User.findOne({uniqueID: book.owner}, function (err, user) {
        callback(err, user, that.amount, book.ownerTitle);
      });
    }
  });
});

mongoose.model('Deal', dealSchema);
