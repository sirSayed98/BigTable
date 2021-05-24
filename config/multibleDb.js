const mongoose = require("mongoose");

const connectMultiple = async (connectionString, host = "one") => {
  try {
    const conn = await mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected ${host}`);
    return conn;
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectMultiple;
