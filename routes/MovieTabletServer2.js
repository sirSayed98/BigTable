const express = require("express");
const {
  getMoviesTabletServer,
  getMoviesTabletPartion,
  deleteMovieByID,
  updateMovieByID,
  createMovie,
} = require("../controllers/MovieTabletServerTwo");

const router = express.Router();

router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesTabletServer);
router.route("/").post(createMovie);

router.route("/:tabletID/:id").delete(deleteMovieByID);
router.route("/:id").put(updateMovieByID);

module.exports = router;
