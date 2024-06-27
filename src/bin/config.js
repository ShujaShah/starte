const mongoose = require('mongoose');
const colors = require('colors');

// let databaseConnectionURL = `${process.env.DATABASE_CLOUD}`.replace(
//   '<password>',
//   process.env.DATABASE_PASSWORD
// );

let databaseConnectionURL = 'mongodb://localhost:27017/LMSBE';

mongoose
  .connect(databaseConnectionURL)
  .then(() => {
    console.log(
      'Connected to the database '.bgGreen.bold,
      databaseConnectionURL.bgBlue.bold
    );
  })
  .catch((err) => {
    console.log('Error connecting to database');
    // console.log(err);
    process.exit(1);
  });

module.exports = {
  _db: mongoose.connection,
};
