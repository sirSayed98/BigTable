const express = require("express");
const {
  getMoviesTabletServer,
  getMoviesTabletPartion,
  deleteMovieByID,
  updateMovieByID,
  createMovie,
} = require("../controllers/MovieTabletServerOne");

const router = express.Router();

const { MutexLock, MutexUnLock } = require("../middleware/mutex");

router.route("/Part/:id").get(MutexLock, getMoviesTabletPartion, MutexUnLock);
router.route("/").get(MutexLock, getMoviesTabletServer, MutexUnLock);
router.route("/").post(MutexLock, createMovie, MutexUnLock);

router.route("/:tabletID/:id").delete(MutexLock, deleteMovieByID, MutexUnLock);
router.route("/:id").put(MutexLock, updateMovieByID, MutexUnLock);

module.exports = router;
