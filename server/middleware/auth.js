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
      next();
    } else {
      hash = hashUtils.createRandom32String();
      var query2 = `INSERT INTO sessions (hash) VALUES ('${hash}')`;
      db.query(query2, () => {
        req.session.hash = hash;
        res.cookie('shortlyid', hash);
        next();
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
  console.log('signup request');
  db.query(`SELECT * FROM users WHERE username = '${req.body.username}'`, (err, result) => {
    if (result.length > 0) {
      console.log('user exists');
      res.redirect('/signup');
    } else {
      models.Users.create({ username: req.body.username, password: req.body.password })
        .then(() => {
          db.query('INSERT INTO signedup (signedup) VALUES (1)', err => {
            var query = `UPDATE (sessions, users) SET sessions.userId = users.id WHERE users.username = '${req.body.username}'`;
            db.query(query, (err) => {
              console.log('signup successfully');
              res.redirect('/');
            });
          });
        });
    }
  });
};

const verifySessionAtLogIn = (req, res, next) => {
  console.log('login request');
  var q = `SELECT * FROM users WHERE username = '${req.body.username}'`;
  var id;
  db.query(q, (err, result) => {
    if (result.length === 0) {
      res.redirect('/login');
    } else {
      var match = models.Users.compare(req.body.password, result[0].password, result[0].salt);
      if (match) {
        console.log('loggin successfully');
        db.query('UPDATE signedup SET signedup = 1', err => {
          res.redirect('/');
        });
      } else {
        res.redirect('/login');
      }
    }
  });

};

const destroySessionAfterLogOut = (req, res, next) => {
  console.log('request received at logout');
  var q = 'TRUNCATE TABLE sessions';
  db.query(q, (err) => {
    db.query('TRUNCATE TABLE signedup', err => {
      hash = hashUtils.createRandom32String();
      res.cookie('shortlyid', hash);
      next();
    });
  });
};

module.exports = { createSession, verifySessionAtSignUp, verifySessionAtLogIn, destroySessionAfterLogOut };