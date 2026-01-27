import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  googleLogin,
  logoutUser,
  updateUserRole,
  updateUserDesignation,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/google-login", googleLogin);
router.patch("/update-designation/:id", updateUserDesignation);
router.patch("/update-role/:id", updateUserRole);
router.route("/").get(getUsers).post(createUser);
router.post("/logout", logoutUser);

router
  .route("/:id")
  .get(protect, getUserById)
  .put(protect, updateUser)
  .delete(protect, deleteUser);

export default router;
