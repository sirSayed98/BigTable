const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Movie = require("../models/Movie");


exports.getMovies = asyncHandler(async (req, res, next) => {
  

  const Movies = await Movie.find().limit(20);

  console.log("________")
  res.status(200).json({
    success: true,
    data: Movies,
  });

});