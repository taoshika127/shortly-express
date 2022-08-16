const models = require('../models');
const Promise = require('bluebird');
const hashUtils = require('../lib/hashUtils');
const { parseCookies } = require('./cookieParser');
const db = require('../db');

var createNewCookie = (req, res, next) => {
  req.session.hash = hashUtils.createRandom32String();
  res.cookies['shortlyid'] = {};
  res.cookies['shortlyid'].value = req.session.hash;
  var query = `INSERT INTO sessions (hash) VALUES ('${req.session.hash}')`;
  db.query(query, () => {
    next();
  });
};

module.exports.createSession = (req, res, next) => {
  //it will receive the request from the parseCookie to look into the req.cookies object. The req.session object will then be created;
  //then it will check the shortlyId from the cookies, and see if the database can map it to the username and userid. If not;
  //the system will generate a random hash for it, update the database too
  parseCookies(req, res, (result) => {
    console.log(req.body);
    if (!req.session) {
      req.session = {};
    }
    if (Object.keys(result).length === 0) {
      createNewCookie(req, res, next);
    } else {
      var sessionId = req.cookies['shortlyid'];
      var query = `SELECT * FROM sessions LEFT JOIN users ON sessions.userId = users.id AND sessions.hash = '${sessionId}'`;
      db.query(query, (err, result) => {
        console.log('result', result);
        if (result.length >= 1) {
          req.session.hash = sessionId;
          req.session.user = { username: result[0].username };
          req.session.userId = result[0].userId;
          next();
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

