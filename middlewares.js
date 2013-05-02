var mongoose = require('mongoose');
var User = mongoose.model('User');
var Book = mongoose.model('Book');

exports.xauth = function (req, res, next) {
  var uniqueID = req.get('X-UDID');
  if (!uniqueID) {
    return next(new Error('Auth required.'));
  }
  User.findOne({uniqueID: uniqueID}, function (err, user) {
    if (user) {
      req.user = user;
      next();
    } else {
      user = new User({uniqueID: uniqueID});
      user.save(function () {
        req.user = user;
        next();
      });
    }
  });
};

exports.fetchBook = function (req, res, next, id) {
  Book.findOne({
    uniqueID: id
  }, function (err, book) {
    if (book) {
      req.book = book;
    }
    next();
  });
};
