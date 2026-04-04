const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getMonthlyTrend,
} = require("../controller/dashboardController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", getDashboard);
router.get("/trend", getMonthlyTrend);

module.exports = router;
