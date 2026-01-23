import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import Task from "../models/taskModel.js";

const router = express.Router();

router.route("/").get(protect, getTasks).post(protect, createTask);

router.route("/:id").put(protect, updateTask).delete(protect, deleteTask);
router.get("/all", protect, async (req, res) => {
  if (req.user.role === "Employee") {
    return res.status(403).json({ message: "Access denied" });
  }
  const users = await User.find().select("name role email");
  res.json(users);
});

router.post("/:id/notes", protect, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (String(task.assignedTo) !== String(req.user._id))
    return res.status(403).json({ message: "Not authorized" });

  task.notes.push({ message: req.body.message });
  await task.save();

  res.json(task);
});

router.get("/", protect, async (req, res) => {
  try {
    const role = req.query.role;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("name email role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
