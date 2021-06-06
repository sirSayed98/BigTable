const express = require("express");
const {
  getMovies,
  editMovie,
  deleteMovie,
  addMovie,
} = require("../controllers/TabletServerOneClientController");

const router = express.Router();

const { MutexLock, MutexUnLock } = require("../middleware/mutex");

router.route("/").get(getMovies);

router.route("/").delete(deleteMovie);

router.route("/:id").put(editMovie);

router.route("/").post(addMovie);

module.exports = router;
