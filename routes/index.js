var async = require('async');
var mongoose = require('mongoose');
var Book = mongoose.model('Book');
var Deal = mongoose.model('Deal');

exports.index = function (req, res) {
  res.json({});
};

exports.getUser = function (req, res) {
  res.json({user: req.user});
};

exports.modifyUser = function (req, res) {
  if (req.body.nickname) {
    req.user.nickname = req.body.nickname;
  }
  if (typeof req.body.device === 'object' &&
      req.body.device.type &&
      req.body.device.token) {
    req.user.device = req.body.device;
  }
  req.user.save(function () {
    res.json({message: 'User profile has been modified successfully.'});
  });
};

exports.addBook = function (req, res, next) {
  var book = new Book({
    owner: req.user.uniqueID,
    ownerTitle: req.body.title
  });
  book.save(function (err) {
    if (err) {
      next(err);
    } else {
      res.json({
        message: 'Book has been created successfully.',
        uniqueID: book.uniqueID
      });
    }
  });
};

exports.modifyDeal = function (req, res, next) {
  if (!req.book) {
    return res.json(404, {error: 'Can\'t find the book.'});
  }
  Deal.findOne({uniqueID: req.params.dealId}, function (err, deal) {
    // Exists? Update the deal:
    if (deal) {
      if (req.body.description) {
        deal.description = req.body.description;
        deal.save();
      }
      if (req.body.read) {
        if (req.book.owner === req.user.uniqueID) {
          deal.ownerRead = true;
        } else {
          deal.participantRead = true;
        }
        deal.save();
      }
      res.json({
        message: 'Deal infomation has been changed successfully.',
        deal: deal
      });

    // Not Exists? Insert a new deal:
    } else {
      req.body.book = req.params.bookId;
      req.body.uniqueID = req.params.dealId;
      if (req.book.owner === req.user.uniqueID) {
        req.body.ownerRead = true;
      } else {
        req.body.participantRead = true;
      }
      deal = new Deal(req.body);
      deal.save(function (err) {
        if (err) {
          next(err);
        } else {
          res.json({
            message: 'The deal has been created successfully.',
            deal: deal
          });
        }
      });
    }
  });
};

exports.deleteDeal = function (req, res, next) {
  if (!req.book) {
    return res.json(404, {error: 'Can\'t find the book.'});
  }
  Deal.findOne({uniqueID: req.params.dealId}, function (err, deal) {
    if (err) {
      next(err);
    } else {
      deal.remove();
      res.json({message: 'The deal has been removed successfully.'});
    }
  });
};

exports.getBookList = function (req, res) {
  Book.find({$or: [{owner: req.user.uniqueID}, {participant: req.user.uniqueID}]}, function (err, docs) {
    res.json({books: docs.map(function (doc) {
      return doc.fetch(req.user);
    })});
  });
};

exports.deleteBook = function (req, res, next) {
  if (req.book) {
    req.book.remove(function (err) {
      if (err) {
        next(err);
      } else {
        Deal.remove({book: req.book.uniqueID}, function (err) {
          if (err) {
            next(err);
          } else {
            res.json({message: 'The book has been removed successfully.'});
          }
        });
      }
    });
  } else {
    res.json(404, {error: 'Can\'t find the book.'});
  }
};

exports.getBook = function (req, res, next) {
  var bookIds = req.params.bookIds.split(';');
  async.map(bookIds, function (bookId, callback) {
    Book.findOne({
      uniqueID: bookId
    }, function (err, book) {
      if (!book) {
        return callback(null, {});
      }
      book = book.fetch(req.user);
      Deal.find({book: bookId}, function (err, deal) {
        if (err) {
          return callback(err);
        }
        book.deals = deal;
        callback(null, book);
      });
    });
  }, function (err, books) {
    if (err) {
      return next(err);
    } else {
      res.json({books: books});
    }
  });
};

exports.modifyBook = function (req, res, next) {
  if (!req.book) {
    return res.json(404, {error: 'Can\'t find the book.'});
  }
  if (req.book.owner === req.user.uniqueID) {
    return next(new Error('You are already the owner of this book.'));
  }
  req.book.participant = req.user.uniqueID;
  req.book.participantTitle = req.body.title;
  req.book.save();
  res.json({message: 'Link successfully!'});
};


exports.linkViewPage = function (req, res) {
  res.render('link', {bookId: req.params.bookId});
};
