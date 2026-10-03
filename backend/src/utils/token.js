const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      rollNumber: user.rollNumber,
      role: user.role
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

module.exports = {
  generateToken,
  verifyToken
};
