const express = require("express");
const {
  getMovies,

} = require("../controllers/MovieMaster");

const router = express.Router();


router.route("/").get(getMovies);

module.exports = router;