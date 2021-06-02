const express = require("express");
const {
  getMoviesMul,
  getMoviesTabletPartion,
  deleteMovieByID 
} = require("../controllers/MovieTabletServerOne");

const router = express.Router();


router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesMul);

router.route("/:tabletID/:id").delete(deleteMovieByID);

module.exports = router;