const asyncHandler = require("../middleware/async");

//5) ->read row(s)
exports.getMovies = asyncHandler(async (req, res, next) => {
  console.log("______________get_______________");
  console.log(req.body);
  res.status(200).json({ message: "here" });
});

//1)set cells 2)delete cells
exports.editMovie = asyncHandler(async (req, res, next) => {
  console.log("______________Edit _______________");

  console.log(req.url)
  console.log(req.body);
  console.log(req.param);
  console.log(req.param.id);
  res.status(200).json({ message: "here" });
});

//3) Delete row(s)
exports.deleteMovie = asyncHandler(async (req, res, next) => {
  console.log("______________delete _______________");
  console.log(req.body);
  res.status(200).json({ message: "here" });
});

exports.addMovie = asyncHandler(async (req, res, next) => {
  console.log("______________add_______________");
  console.log(req.body);
  res.status(200).json({ message: "here" });
});
