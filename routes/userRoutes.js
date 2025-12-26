import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  googleLogin,
  logoutUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/google-login", googleLogin); // 🔹 Google Sign-In

router.route("/").get(getUsers).post(createUser);

router.post("/logout", logoutUser);
router
  .route("/:id")
  .get(protect, getUserById)
  .put(protect, updateUser)
  .delete(protect, deleteUser);

export default router;
