const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const errorController = require('./controllers/error');
const AppError = require('./utils/AppError');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

var app = express();

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  cors({
    origin: 'http:localhost:5173',
    optionSuccessStatus: 200,
  })
);

app.use('/api/v1', routes);

app.use(errorController);
app.all('*', (req, res, next) => {
  return next(new AppError('Page not found', 404));
});

module.exports = { app };
