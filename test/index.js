var proxyquire = require('proxyquire');
require('should');
var mongoose = require('mongoose');
mongoose.connect('localhost', 'money_test');

// Mock
var MockRes = function (done) {
  this.done = done;
};

MockRes.prototype.json = function (status, obj) {
  if (!obj) {
    obj = status;
    status = 200;
  }
  this.body = obj;
  this.statusCode = status;
  this.done();
};

var MockReq = function (udid) {
  this.body = {};
  this.params = {};
  this.headers = {};
  if (udid) {
    this.headers['X-UDID'] = udid;
  }
};

MockReq.prototype.get = function (key) {
  return this.headers[key];
};

var MockAPNS = {
  hook: function () {},
  __changeHook: function (hook) {
    this.hook = hook;
  },
  addDeal: function (user, amount, title) {
    this.user = user;
    this.amount = amount;
    this.title = title;
    this.hook('addDeal');
  },
  changeDescription: function (users) {
    this.users = users;
    this.hook('changeDescription');
  },
  deleteDeal: function (users) {
    this.users = users;
    this.hook('deleteDeal');
  }
};

// Load Scheme
require('../model/user');
require('../model/book');
proxyquire('../model/deal', {'../libs/apns': MockAPNS});
var User = mongoose.model('User');
var Book = mongoose.model('Book');
var Deal = mongoose.model('Deal');

// Clear the database
User.remove().exec();
Book.remove().exec();
Deal.remove().exec();

// Load route
var route = require('../routes/index');
var mw = require('../middlewares');

// Convenient function
var toJSON = JSON.stringify;


describe('index', function () {
  it('should return ok', function (done) {
    var res = new MockRes(function () {
      this.should.status(200);
      this.body.should.eql({});
      done();
    });
    route.index({}, res);
  });
});

describe('getUser', function () {
  it('should create a new user', function (done) {
    var req = new MockReq('luin');
    var res = new MockRes(function () {
      toJSON(this.body).should.eql(
        toJSON({user: {uniqueID: 'luin'}}));
      done();
    });
    mw.xauth(req, res, function () {
      route.getUser(req, res);
    });
  });
});

describe('modifyUser', function () {
  it('should modify nickname successfully', function (done) {
    var req = new MockReq('luin');
    req.body.nickname = 'Luin';
    var res = new MockRes(function () {
      this.should.status(200);
      req = new MockReq('luin');
      res = new MockRes(function () {
        toJSON(this.body).should.eql(
          toJSON({user: {nickname: 'Luin', uniqueID: 'luin'}}));
        done();
      });
      mw.xauth(req, res, function () {
        route.getUser(req, res);
      });
    });
    mw.xauth(req, res, function () {
      route.modifyUser(req, res);
    });
  });

  it('should modify device successfully', function (done) {
    var req = new MockReq('bob');
    req.body.device = {
      type: 'IOS_SANDBOX',
      token: 'token here'
    };
    var res = new MockRes(function () {
      this.should.status(200);
      req = new MockReq('bob');
      res = new MockRes(function () {
        toJSON(this.body).should.eql(
          toJSON({user: {uniqueID: 'bob', device: {type: 'IOS_SANDBOX', token: 'token here'}}}));
        done();
      });
      mw.xauth(req, res, function () {
        route.getUser(req, res);
      });
    });
    mw.xauth(req, res, function () {
      route.modifyUser(req, res);
    });
  });
});

describe('addBook & getBookList', function () {
  it('should add an book successfully', function (done) {
    var req = new MockReq('luin');
    var res = new MockRes(function () {
      this.should.status(200);
      this.body.message.should.eql('Book has been created successfully.');
      var bookId = this.body.uniqueID;
      var res = new MockRes(function () {
        this.should.status(200);
        this.body.books.should.have.length(1);
        this.body.books[0].uniqueID.should.eql(bookId);
        this.body.books[0].isOwner.should.eql(true);
        done();
      });
      mw.xauth(req, res, function () {
        route.getBookList(req, res);
      });
    });
    mw.xauth(req, res, function () {
      route.addBook(req, res);
    });
  });
});

describe('modifyBookItem', function () {
  var bookId;
  before(function (done) {
    var req = new MockReq('luin');
    req.body.title = 'Yach';
    var res = new MockRes(function () {
      bookId = this.body.uniqueID;
      // Create a new deal
      req = new MockReq('luin');
      req.body.amount = 10;
      req.params.bookId = bookId;
      req.params.dealId = 'exists deal';
      res = new MockRes(function () {
        done();
      });
      mw.fetchBook(req, res, function () {
        mw.xauth(req, res, function () {
          route.modifyDeal(req, res);
        });
      }, req.params.bookId);
    });
    mw.xauth(req, res, function () {
      route.addBook(req, res);
    });
  });
  it('should raise 404 error when the book id not exists', function (done) {
    var req = new MockReq('luin');
    var res = new MockRes(function () {
      this.should.status(404);
      this.body.error.should.eql('Can\'t find the book.');
      done();
    });
    req.params.bookId = 'not exists book';
    mw.xauth(req, res, function () {
      route.modifyDeal(req, res);
    });
  });

  it('should add a new deal when the deal id not exists', function (done) {
    var canDone = false;
    var req = new MockReq('luin');
    var res = new MockRes(function () {
      this.should.status(200);
      this.body.message.should.eql('The deal has been created successfully.');
      this.body.deal.book.should.eql(bookId);
      this.body.deal.uniqueID.should.eql(req.params.dealId);
      this.body.deal.ownerRead.should.eql(true);
      this.body.deal.participantRead.should.eql(false);
      if (canDone) {
        done();
      }
      canDone = true;
    });
    req.params.bookId = bookId;
    req.params.dealId = 'not exists deal';
    req.body.amount = 25;
    MockAPNS.__changeHook(function (event) {
      event.should.eql('addDeal');
      this.amount.should.eql(25);
      this.title.should.eql('Yach');
      if (canDone) {
        done();
      }
      canDone = true;
    });
    mw.fetchBook(req, res, function () {
      mw.xauth(req, res, function () {
        route.modifyDeal(req, res);
      });
    }, req.params.bookId);
  });

  it('should modify the current deal when the deal id exists', function (done) {
    var canDone = false;
    var req = new MockReq('luin');
    var res = new MockRes(function () {
      this.should.status(200);
      this.body.message.should.eql('Deal infomation has been changed successfully.');
      if (canDone) {
        done();
      }
      canDone = true;
    });
    req.params.bookId = bookId;
    req.params.dealId = 'exists deal';
    req.body.description = 'hi';
    MockAPNS.__changeHook(function (event) {
      event.should.eql('changeDescription');
      this.users.should.have.length(2);
      this.users[0].uniqueID.should.eql('luin');
      if (canDone) {
        done();
      }
      canDone = true;
    });
    mw.fetchBook(req, res, function () {
      mw.xauth(req, res, function () {
        route.modifyDeal(req, res);
      });
    }, req.params.bookId);
  });

  it('should delete the deal successfully', function (done) {
    var canDone = false;
    var req = new MockReq('luin');
    req.params.bookId = bookId;
    req.params.dealId = 'exists deal';
    var res = new MockRes(function () {
      this.body.message.should.eql('The deal has been removed successfully.');
      if (canDone) {
        done();
      }
      canDone = true;
    });

    MockAPNS.__changeHook(function (event) {
      event.should.eql('deleteDeal');
      this.users.should.have.length(2);
      this.users[0].uniqueID.should.eql('luin');
      if (canDone) {
        done();
      }
      canDone = true;
    });
    mw.fetchBook(req, res, function () {
      mw.xauth(req, res, function () {
        route.deleteDeal(req, res);
      });
    }, req.params.bookId);
  });
});

function addBook(name, title, callback) {
  var req = new MockReq(name);
  req.body.title = title;
  var res = new MockRes(callback);
  mw.xauth(req, res, function () {
    route.addBook(req, res);
  });
}

function addDeal(bookId, dealId, user, amount, callback) {
  var req = new MockReq(user);
  req.body.amount = amount;
  req.params.bookId = bookId;
  req.params.dealId = dealId;
  var res = new MockRes(callback);
  mw.fetchBook(req, res, function () {
    mw.xauth(req, res, function () {
      route.modifyDeal(req, res);
    });
  }, req.params.bookId);
}

describe('getBook', function () {
  var bookId1, bookId2;
  before(function (done) {
    MockAPNS.__changeHook(function () {});
    addBook('jeff', 'jeffbook', function () {
      bookId1 = this.body.uniqueID;
      addDeal(bookId1, 'jeffbookdeal', 'jeff', 25, function () {
        addBook('jeff', 'jeffbook2', function () {
          bookId2 = this.body.uniqueID;
          addDeal(bookId2, 'jeffbookdeal2', 'jeff', -50, done);
        });
      });
    });
  });

  it('should accept multi books', function (done) {
    var req = new MockReq('jeff');
    req.params.bookIds = bookId1 + ';' + bookId2;
    var res = new MockRes(function () {
      this.should.status(200);
      this.body.books.should.have.length(2);
      this.body.books[0].isOwner.should.eql(true);
      this.body.books[0].deals[0].amount.should.eql(25);
      this.body.books[0].deals[0].book.should.eql(bookId1);
      done();
    });
    mw.xauth(req, res, function () {
      route.getBook(req, res);
    });
  });

  it('should be able to delete a book', function (done) {
    var req = new MockReq('jeff');
    req.params.bookId = bookId1;
    var res = new MockRes(function () {
      this.body.message.should.eql('The book has been removed successfully.');
      res = new MockRes(function () {
        this.body.books.should.have.length(1);
        this.body.books[0].uniqueID.should.eql(bookId2);
        addDeal(bookId2, 'jeffbookdeal', 'jeff', 25, function () {
          this.body.message.should.eql('The deal has been created successfully.');
          done();
        });
      });
      route.getBookList(req, res);
    });
    mw.fetchBook(req, res, function () {
      mw.xauth(req, res, function () {
        route.deleteBook(req, res);
      });
    }, req.params.bookId);
  });
});
