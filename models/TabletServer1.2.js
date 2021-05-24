const mongoose = require("mongoose");

try {
  const conn2 = mongoose.createConnection(
    process.env.TABLET_SERVER_ONE_ONE_CONN,
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    }
  );
  conn2.model("Movie", require("../models/MovieMul"));

  console.log(`MongoDB Connected tablet One`);
  module.exports = conn2;
} catch (error) {
  console.log(error);
}
