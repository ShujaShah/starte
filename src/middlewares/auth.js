const jwt = require('jsonwebtoken');
const { User } = require('../models/entities/user-entity');

const isAuthenticated = async (req, res, next) => {
  try {
    const auth_token = req.cookies.auth_token;

    if (!auth_token) {
      // return next(new Error('you are not logged in', 400));
      return res.status(403).send('You are not logged in ');
    }

    const decoded = jwt.verify(auth_token, process.env.JWTPrivateKey);

    if (!decoded) {
      return next(new Error('Auth token is not valid', 400));
    }
    const user = await User.findById(decoded._id);
    if (!user) {
      return next(new Error('User not found', 400));
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = isAuthenticated;
