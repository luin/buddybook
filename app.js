var express = require('express');
var http = require('http');

var mongoose = require('mongoose');
mongoose.connect('localhost', 'money_production');
// Models
require('./model/user');
require('./model/book');
require('./model/deal');

var app = express();
var routes = require('./routes');
var mw = require('./middlewares');

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(function (req, res, next) {
    res.setHeader('X-Powered-By', 'BuddyBook-Server');
    next();
  });
  app.use(app.router);
  app.use(function (err, req, res, next) {
    // Oops...Just want to make jshint happy.
    var use = function () {};
    use(next);

    res.json(400, {error: err.message});
  });
});

app.param('bookId', mw.fetchBook);

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users/me', mw.xauth, routes.getUser);
app.put('/users/me', mw.xauth, routes.modifyUser);

app.get('/books', mw.xauth, routes.getBookList);
app.post('/books', mw.xauth, routes.addBook);
app.get('/books/:bookIds', mw.xauth, routes.getBook);
app['delete']('/books/:bookId', mw.xauth, routes.deleteBook);
app.put('/books/:bookId/deals/:dealId', mw.xauth, routes.modifyBookItem);
app['delete']('/books/:bookId/deals/:dealId', mw.xauth, routes.deleteBookItem);
app.put('/books/:bookId', mw.xauth, routes.modifyBook);

app.get('/link/:bookId', routes.linkViewPage);

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

