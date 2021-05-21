const mongoose = require('mongoose');

const connectDB = async (connectionString) => {
  try {
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
  }

};

module.exports = connectDB;