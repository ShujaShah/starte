const ejs = require('ejs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { User, validateUser } = require('../models/entities/user-entity');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendMail = require('../utils/send-mail');
const Joi = require('joi');

// Function to create a user
//(This function is responsible for sending email to user for the activation of account )
const createUser = catchAsync(async (req, res, next) => {
  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).send('Invalid user data');
  }

  let user = await User.findOne({ email: req.body.email });

  if (user) {
    return res.status(400).send('User already exists');
  }

  user = new User({
    email: req.body.email,
    name: req.body.name,
    password: req.body.password,
    role: req.body.role,
  });

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  createTokens(user, res);

  const { activationCode, token } = createActivationToken(user);

  sendActivationEmail(user, activationCode, token, req, res, next);
});
// ==============================================END OF CREATE REGISTER USR FUNCTION===================================================

async function createTokens(user, res) {
  const auth_token = user.generateAuthToken();
  const refresh_token = user.generateRefreshToken();

  const auth_cookie_options = {
    expires: new Date(Date.now() + 86400000),
    httpOnly: true,
    sameSite: 'None',
  };

  const refresh_cookie_options = {
    expires: new Date(Date.now() + 365 * 86400000),
    httpOnly: true,
    sameSite: 'None',
  };

  res.cookie('auth_token', auth_token, auth_cookie_options);
  res.cookie('refresh_token', refresh_token, refresh_cookie_options);
}

const sendActivationEmail = async (
  user,
  activationCode,
  token,
  req,
  res,
  next
) => {
  const data = { user: { name: user.name }, activationCode };
  const html = ejs.renderFile(
    path.join(__dirname, '../mails/activation-email.ejs'),
    data
  );
  try {
    await sendMail({
      email: user.email,
      subject: 'Activate your account',
      template: 'activation-email.ejs',
      data,
    });
    res.status(201).json({
      success: true,
      activationCode: activationCode,
      token: token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: 'Failed to send activation email',
    });
  }
};

//Create 2FA and activation token
const createActivationToken = (user) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a random four-digit code
  const expiresIn = 600; // 10 minutes in seconds

  // Calculate expiration timestamp
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

  // Create a JSON Web Token, token contains the payload with two properties: user and 4 digit activation code
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.JWTPrivateKey,
    {
      expiresIn: expiresIn + 's',
    }
  );
  return { token, activationCode };
};

//================================================FUNCTION TO VERIFY TWO FA OF USER ====================================================
//After successfully giving the code and token, user gets saved into the DataBase

const VerifyTwoFa = catchAsync(async (req, res, next) => {
  const { activation_token, activation_code } = req.body;

  try {
    const decodedToken = jwt.verify(
      activation_token,
      process.env.JWTPrivateKey
    );

    // Check if activation code is valid
    if (decodedToken.activationCode !== activation_code) {
      return res.status(400).send('Code is not valid...');
    }

    // Check if the token has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.expirationTime < currentTime) {
      return res.status(400).send('Activation token has expired');
    }

    const { email, name, password } = decodedToken.user;

    // Check if the email already exists
    let existing_user = await User.findOne({ email });
    if (existing_user) {
      return res.status(500).send('User with that email already exists');
    }

    let new_user = await User.create({
      email,
      name,
      password,
    });
    createTokens(new_user, res);
    res.status(201).json({
      success: true,
      data: new_user,
    });
  } catch (error) {
    return res.status(400).send('Invalid activation token');
  }
});

// ============================================FUNCTION TO LOGIN =============================================================
const Login = catchAsync(async (req, res, next) => {
  try {
    const { error } = validateUserLogin(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    let user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid Email or Password');

    //Compare the Passwords
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword)
      return res.status(400).send('Email or Password Incorrect');

    const token = user.generateAuthToken();
    createTokens(user, res);
    user = await user.populate('email');
    res.status(201).json({
      success: 'true',
      data: user,
      token: token,
    });
  } catch (error) {
    console.log(error);
  }
});

//Validation for the login
const validateUserLogin = (user) => {
  const schema = Joi.object({
    email: Joi.string().email({}).required(),
    password: Joi.string().required(),
  });
  return schema.validate(user);
};

//=============================================FUNCTION TO GET THE CURRENT USER====================================
const LoggedInUser = catchAsync(async (req, res, next) => {
  try {
    const loggedUser = req.user;
    const user = await User.findById(loggedUser).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
  }
});

//=================================FUNCTION TO LOGOUT THE USER========================================
const LogOut = catchAsync(async (req, res, next) => {
  try {
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    if (!req.cookies || Object.keys(req.cookies).length === 0) {
      return res.status(401).send('You are not logged in');
    }
    res.status(201).json({
      success: true,
      message: 'logged out successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

//=================================FUNCTION TO UPDATE THE USER==============================================
const UpdateUser = catchAsync(async (req, res, next) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
      avatar: req.body?.avatar,
    },
    {
      new: true,
    }
  );
  if (!user) return res.status(400).send('No user with the given id found');
  res.status(201).json({
    success: true,
    user: user,
  });
});

const DeleteUser = catchAsync(async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(400).send('user with the given id does not exist');
    res.status(201).json({
      success: true,
      message: 'user successfully deleted',
    });
  } catch (error) {
    console.log(error);
  }
});
const GetAllUsers = catchAsync(async (req, res, next) => {
  try {
    const users = await User.find();
    console.log(users);
    if (!users) res.status(400).send('user collection is empty');
    let usersCount = await User.countDocuments();

    res.status(201).json({
      success: true,
      count: usersCount,
      data: users,
    });
  } catch (error) {
    console.log(error);
  }
});
const GetSingleUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(400).send('user not found');
  res.status(201).json({
    success: true,
    data: user,
  });
});
module.exports = {
  createUser,
  VerifyTwoFa,
  Login,
  LoggedInUser,
  LogOut,
  UpdateUser,
  DeleteUser,
  GetAllUsers,
  GetSingleUser,
};
