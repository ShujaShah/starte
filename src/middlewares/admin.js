const jwt = require('jsonwebtoken');

function isAdmin(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).send('Access denied...Please login');
  try {
    const decoded = jwt.verify(token, process.env.JWTPrivateKey);
    req.user = decoded;
    if (req.user.role !== 'admin')
      res.status(403).send('You are not authorized to perform this action...');
    return;
  } catch (ex) {
    res.status(400).send('Invalid Token');
  }
}

module.exports = isAdmin;
