const express = require("express");
const {
  getMoviesMul,
  getMoviesTabletPartion 
} = require("../controllers/MovieTabletServerOne");

const router = express.Router();


router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesMul);

module.exports = router;