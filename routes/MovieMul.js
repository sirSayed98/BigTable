const express = require("express");
const {
  getMoviesMul,

} = require("../controllers/MovieMul");

const router = express.Router();


router.route("/").get(getMoviesMul);

module.exports = router;