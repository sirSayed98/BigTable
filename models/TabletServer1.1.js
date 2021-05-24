const mongoose = require("mongoose");

try {
  const conn1 = mongoose.createConnection(process.env.TABLET_SERVER_ONE_CONN, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  });
  conn1.model("Movie", require("../models/MovieMul"));

  console.log(`MongoDB Connected tablet Two`);
  module.exports = conn1;
} catch (error) {
  console.log(error);
}
