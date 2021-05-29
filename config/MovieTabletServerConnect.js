const mongoose = require("mongoose");

exports.connectToDB = (connectionString, tabletNumber) => {
  try {
    const conn = mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    conn.model("Movie", require("../models/MovieMul"));

    console.log(`MongoDB Connected tablet ${tabletNumber}`);
    return conn;
  } catch (error) {
    console.log(error);
  }
};
