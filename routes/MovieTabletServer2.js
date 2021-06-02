const express = require("express");
const {
  getMoviesTabletServer2,
  getMoviesTabletPartion,
  deleteMovieByID
} = require("../controllers/MovieTabletServerTwo");

const router = express.Router();

router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesTabletServer2);
router.route("/:tabletID/:id").delete(deleteMovieByID);

module.exports = router;
