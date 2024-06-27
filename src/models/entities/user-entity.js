const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      trim: true,
      required: true,
      lowercase: true,
      minlength: 5,
      maxlength: 50,
    },
    name: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      minlength: 4,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'Instructor'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseId: String,
      },
    ],
  },
  { timestamps: true }
);

userSchema.methods.generateAuthToken = function () {
  const auth_token = jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.JWTPrivateKey,
    { expiresIn: '3d' }
  );
  return auth_token;
};

userSchema.methods.generateRefreshToken = function () {
  const refresh_token = jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.JWTPrivateKey,
    { expiresIn: '90d' }
  );
  return refresh_token;
};
const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = Joi.object({
    email: Joi.string().email().min(5).required(),
    name: Joi.string().min(3).required(),
    password: Joi.string().min(5).required(),
    avatar: Joi.string(),
    role: Joi.string(),
    isVerified: Joi.boolean(),
    courses: Joi.array(),
  });
  return schema.validate(user);
}

module.exports = {
  User,
  validateUser,
};
