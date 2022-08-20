const models = require('../models');
const Promise = require('bluebird');
const hashUtils = require('../lib/hashUtils');
const { parseCookies } = require('./cookieParser');
var mysql = require('mysql2');
const db = mysql.createConnection({
  user: 'root',
  password: '',
  database: 'shortly'
});

var createNewCookie = (req, res, next) => {
  var hash;
  var query = 'SELECT * FROM sessions';
  db.query(query, (err, result) => {
    if (result.length >= 1) {
      next(null, res);
    } else {
      hash = hashUtils.createRandom32String();
      var query2 = `INSERT INTO sessions (hash) VALUES ('${hash}')`;
      db.query(query2, () => {
        req.session.hash = hash;
        res.cookie('shortlyid', hash);
        next(null, res);
      });
    }
  });

};

var updateCookieAfterVerification = (result, req, res, next) => {
  req.session.hash = req.cookies['shortlyid'];
  res.cookie('shortlyid', req.session.hash);
  req.session.user = { username: result[0].username };
  req.session.userId = result[0].userId;
  next(null, res);
};

const createSession = (req, res, next) => {
  //it will receive the request from the parseCookie to look into the req.cookies object. The req.session object will then be created;
  //then it will check the shortlyId from the cookies, and see if the database can map it to the username and userid. If not;
  //the system will generate a random hash for it, update the database too
  var queryString = 'SELECT * FROM sessions';
  parseCookies(req, res, (result) => {
    if (!req.session) {
      req.session = {};
    }
    if (Object.keys(result).length === 0) {
      createNewCookie(req, res, next);
    } else {
      //if already cookie, verify to see if it is mathcing the session db. If yes,
      var sessionId = req.cookies['shortlyid'];
      var query = `SELECT * FROM sessions LEFT JOIN users ON sessions.userId = users.id AND sessions.hash = '${sessionId}'`;
      db.query(query, (err, result) => {
        if (result.length >= 1) {
          updateCookieAfterVerification(result, req, res, next);
        } else {
          createNewCookie(req, res, next);
        }
      });
    }
  });
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

const verifySessionAtSignUp = (req, res, next) => {
  db.query('SELECT * FROM users', (err, result) => {
    if (result.length === 0) {
      models.Users.create({ username: req.body.username, password: req.body.password})
        .then(() => {
          res.redirect('/');
        });

      // var query = `INSERT INTO users (username, password) VALUES ('${req.body.username}', '${req.body.password}')`;
      // db.query(query, (err) => {
      //   next();
      // });
    } else {
      var q = `SELECT * FROM users WHERE username = '${req.body.username}'`;
      db.query(q, (err, result) => {
        if (result.length > 0) {
          //user exists
          res.redirect('/signup');
        }
      });
    }
  });
};

const verifySessionAtLogIn = (req, res, next) => {
  var q = `SELECT * FROM users WHERE username = '${req.body.username}'`;
  db.query(q, (err, result) => {
    if (result.length === 0) {
      res.redirect('/login');
    } else {
      var result = models.Users.compare(req.body.password, result[0].password, result[0].salt);
      if (result) {
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    }
  });

};

module.exports = { createSession, verifySessionAtSignUp, verifySessionAtLogIn };