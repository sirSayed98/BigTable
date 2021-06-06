const {
  updateMovieByID,
  createMovie,
  getMoviesTabletServer,
  deleteMovieByID,
} = require("./MovieTabletServerTwo");

const asyncHandler = require("../middleware/async");

//1)set cells 2)delete cells
exports.editMovie = asyncHandler(async (req, res, next) => {
  console.log(`[TABLET] recieved Set/delete cells request from Client`);
  let id = req.url.split("/")[1];
  req.params.id = id;

  updateMovieByID(req, res, next);
});

// 3) Delete row(s)
exports.deleteMovie = asyncHandler(async (req, res, next) => {
  console.log("[TABLET] Client request delete films");

  req.body.ids = req.body.ids.map((el) => {
    return el * 1;
  });

  deleteMovieByID(req, res, next);
});

// 4) Add Movie
exports.addMovie = asyncHandler(async (req, res, next) => {
  console.log("[Tablet] recieved Add request");
  createMovie(req, res, next);
});

//5) ->read row(s)
exports.getMovies = asyncHandler(async (req, res, next) => {
  console.log("[TABLET] Client reqest films");

  req.body.ids = req.body.ids.map((el) => {
    return el * 1;
  });

  getMoviesTabletServer(req, res, next);
});
