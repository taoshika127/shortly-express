const parseCookies = (req, res, next) => {
  //it will check if the request is with a cookie or not. if not, it will assign an empty cookies obj. Eventually the req.cookies
  //obj will be updated with shortlyId(s)
  if (req.cookies === undefined) {
    req.cookies = {};
  } else {
    if (!req.headers.cookie) {
    } else {
      var cookiesArr = req.headers.cookie.split('; ');
      cookiesArr.forEach(str => {
        var index = str.search('=');
        var key = str.slice(0, index);
        var value = str.slice(index + 1);
        req.cookies[key] = value;
      });
    }
  }
  next(req.cookies);
};

module.exports = { parseCookies };