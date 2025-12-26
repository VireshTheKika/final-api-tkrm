import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import { addEventToCalendar } from "../utils/googleCalendar.js";
import sendEmail from "../utils/sendEmail.js";

//  CREATE TASK (Admin/Manager only)
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, assignedTo, deadline } = req.body;

    // 🔒 Restrict Employees
    if (req.user.role === "Employee") {
      return res
        .status(403)
        .json({ message: "Access denied — Employees cannot create tasks" });
    }

    // 🧾 Validate inputs
    if (!title || !assignedTo) {
      return res
        .status(400)
        .json({ message: "Title and assignedTo are required" });
    }

    // 🕒 Validate deadline (optional)
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // start of today

      const selectedDeadline = new Date(deadline);
      selectedDeadline.setHours(0, 0, 0, 0);

      if (selectedDeadline < today) {
        return res
          .status(400)
          .json({ message: "Deadline must be today or a future date" });
      }
    }

    // 👥 Check assigned user validity
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    if (assignedUser.role !== "Employee") {
      return res
        .status(400)
        .json({ message: "Tasks can only be assigned to employees" });
    }

    // 🆕 Create task
    const task = await Task.create({
      title,
      description,
      priority: priority || "Low",
      assignedTo,
      assignedBy: req.user._id,
      deadline: deadline ? new Date(deadline) : null,
    });

    // try {
    //   const emailSubject = `🗓️ New Task Assigned: ${title}`;
    //   const emailBody = `
    //     <h2>Hello ${assignedUser.name},</h2>
    //     <p>You have been assigned a new task by <b>${req.user.name}</b>.</p>
    //     <p><b>Task Title:</b> ${title}</p>
    //     <p><b>Description:</b> ${description || "No description provided."}</p>
    //     <p><b>Priority:</b> ${priority || "Low"}</p>
    //     ${
    //       deadline
    //         ? `<p><b>Deadline:</b> ${new Date(
    //             deadline
    //           ).toLocaleDateString()}</p>`
    //         : ""
    //     }
    //     <p>Please log in to your dashboard to view and update the task status.</p>
    //     <br/>
    //     <p>Regards,<br/>Task Manager System</p>
    //   `;

    //   await sendEmail(assignedUser.email, emailSubject, emailBody);
    //   console.log(`Task assignment email sent to ${assignedUser.email}`);
    // } catch (emailError) {
    //   console.error("Failed to send email:", emailError.message);
    // }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server error while creating task" });
  }
};

//  GET ALL TASKS (Admin/Manager see all, Employee sees own)
export const getTasks = async (req, res) => {
  try {
    let tasks;
    if (req.user.role === "Employee") {
      tasks = await Task.find({ assignedTo: req.user._id })
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 });
    } else {
      tasks = await Task.find()
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 });
    }
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: error.message });
  }
};

//  UPDATE TASK (status, notes, or deadline)
export const updateTask = async (req, res) => {
  try {
    const { status, note, deadline } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // 🔒 Employees can only update their own tasks
    if (
      req.user.role === "Employee" &&
      task.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (status) task.status = status;
    if (note) task.notes.push({ message: note });
    if (deadline) {
      if (new Date(deadline) < new Date()) {
        return res
          .status(400)
          .json({ message: "Deadline cannot be in the past" });
      }
      task.deadline = new Date(deadline);
    }

    await task.save();
    res.json({ success: true, message: "Task updated successfully", task });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: error.message });
  }
};

//  DELETE TASK (Admin/Manager only)
export const deleteTask = async (req, res) => {
  try {
    if (req.user.role === "Employee") {
      return res.status(403).json({ message: "Access denied" });
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: error.message });
  }
};
