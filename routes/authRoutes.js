const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateMe,
  logout,
} = require("../controller/authController");
const { protect } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  registerValidator,
  loginValidator,
} = require("../validators/authValidators");

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;
