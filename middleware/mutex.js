const asyncHandler = require("../middleware/async");
var sleep = require("system-sleep");
let lock = 1;

// Protect routes
exports.MutexLock = asyncHandler(async (req, res, next) => {
  if (lock == 0) {
    return res.status(200).json({ success: false, data: "you are blocked" });
  }
  if ((req.method === "PUT" || req.method === "DELETE") && lock == 1) {
    console.log("[TABLET] REQUIRE LOCK");
    lock = 0;
    return next();
  } else {
    next();
  }
});

exports.MutexUnLock = asyncHandler(async (req, res, next) => {
  if (lock == 0) {
    lock = 1;
    console.log("[TABLET] Release lock");
  }
  next();
});
