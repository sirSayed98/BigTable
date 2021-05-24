const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

const MovieTablet1 = require("../models/TabletServer1.1");
const MovieTablet2 = require("../models/TabletServer1.2");

exports.getMoviesMul = asyncHandler(async (req, res, next) => {

  const arr1 = await MovieTablet1.db.collection("Movie").find().toArray();
  const arr2 = await MovieTablet2.db.collection("Movie").find().toArray();

  const films = arr1.concat(arr2);

  res.status(200).json({
    success: true,
    data: films,
  });
  
});
