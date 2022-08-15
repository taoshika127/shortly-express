const parseCookies = (req, res, next) => {
  console.log(req.headers.cookie);
  if (!req.headers.cookie) {
    req.cookies = {};
    //res.send(req.cookies);
  } else {
    var cookiesArr = req.headers.cookie.split('; ');
    cookiesArr.forEach(str => {
      var index = str.search('=');
      var key = str.slice(0, index);
      var value = str.slice(index + 1);
      req.cookies[key] = value;
    });
    //res.send(req.cookies);
  }
  next();

};

module.exports = parseCookies;