import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Client from "../models/Client.js";
import { addEventToCalendar } from "../utils/googleCalendar.js";
import sendEmail from "../utils/sendEmail.js";

export const createTask = async (req, res) => {
  try {
    const { title, description, client, priority, assignedTo, deadline } =
      req.body;

    // Restrict Employees
    if (req.user.role === "Employee") {
      return res
        .status(403)
        .json({ message: "Access denied — Employees cannot create tasks" });
    }

    // Validate inputs
    if (!title || !assignedTo || !client) {
      return res.status(400).json({
        message: "Title, client and assignedTo are required",
      });
    }

    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selectedDeadline = new Date(deadline);
      selectedDeadline.setHours(0, 0, 0, 0);

      if (selectedDeadline < today) {
        return res
          .status(400)
          .json({ message: "Deadline must be today or a future date" });
      }
    }

    // Validate client
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(400).json({ message: "Invalid client selected" });
    }

    // Check assigned user validity
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    if (assignedUser.role !== "Employee") {
      return res
        .status(400)
        .json({ message: "Tasks can only be assigned to employees" });
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      client, // ObjectId reference
      priority: priority || "Low",
      assignedTo,
      assignedBy: req.user._id,
      deadline: deadline ? new Date(deadline) : null,
    });

    try {
      const emailSubject = ` New Task Assigned: ${title}`;
      const emailBody = `
        <h2>Hello ${assignedUser.name},</h2>
        <p>You have been assigned a new task by <b>${req.user.name}</b>.</p>
        <p><b>Task Title:</b> ${title}</p>
        <p><b>Description:</b> ${description || "No description provided."}</p>
        <p><b>Priority:</b> ${priority || "Low"}</p>
        ${
          deadline
            ? `<p><b>Deadline:</b> ${new Date(
                deadline,
              ).toLocaleDateString()}</p>`
            : ""
        }
        <p>Please log in to your dashboard to view and update the task status.</p>
        <br/>
        <p>Regards,<br/>Task Manager System</p>
      `;

      sendEmail(assignedUser.email, emailSubject, emailBody).catch(
        console.error,
      );

      console.log(`📧 Task assignment email sent to ${assignedUser.email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send email:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ message: "Server error while creating task" });
  }
};

export const getTasks = async (req, res) => {
  try {
    let tasks;

    const populateOptions = [
      { path: "client", select: "name" },
      { path: "assignedBy", select: "name email" },
      { path: "assignedTo", select: "name email" },
    ];

    if (req.user.role === "Employee") {
      tasks = await Task.find({ assignedTo: req.user._id })
        .populate(populateOptions)
        .sort({ createdAt: -1 });
    } else {
      tasks = await Task.find()
        .populate(populateOptions)
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

export const startTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.startTime)
      return res.status(400).json({ message: "Task already started" });

    const now = new Date();

    task.startTime = now;
    task.lastResumedAt = now;
    task.status = "Ongoing";
    task.isPaused = false;
    task.pausedAt = null;
    task.pausedDuration = 0;
    task.totalWorkedSeconds = 0;

    await task.save();
    await task.populate("assignedBy", "name email");

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const togglePause = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!task.startTime)
      return res.status(400).json({ message: "Task not started" });
    if (task.status === "Completed")
      return res.status(400).json({ message: "Already completed" });

    const now = new Date();

    if (!task.isPaused) {
      const workedSeconds = Math.floor(
        (now - new Date(task.lastResumedAt)) / 1000,
      );
      task.totalWorkedSeconds += workedSeconds;

      task.isPaused = true;
      task.status = "Paused";
      task.pausedAt = now;
    } else {
      task.isPaused = false;
      task.status = "Ongoing";
      task.pausedAt = null;
      task.lastResumedAt = now;
    }

    await task.save();
    await task.populate("assignedBy", "name email");

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.status === "Completed")
      return res.status(400).json({ message: "Already completed" });

    const now = new Date();

    if (!task.isPaused) {
      const workedSeconds = Math.floor(
        (now - new Date(task.lastResumedAt)) / 1000,
      );
      task.totalWorkedSeconds += workedSeconds;
    }

    task.status = "Completed";
    task.endTime = now;
    task.isPaused = false;
    task.lastResumedAt = null;
    task.pausedAt = null;

    await task.save();
    await task.populate("assignedBy", "name email");

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reopenTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.status !== "Completed")
      return res
        .status(400)
        .json({ message: "Only completed tasks can be reopened" });

    const now = new Date();

    task.status = "Ongoing";
    task.isPaused = false;
    task.endTime = null;
    task.lastResumedAt = now;
    task.pausedAt = null;

    await task.save();
    await task.populate("assignedBy", "name email");

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestTaskCompletion = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Employee can only request their own task
    if (
      req.user.role === "Employee" &&
      task.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (task.status === "Completed") {
      return res.status(400).json({ message: "Task already completed" });
    }

    const now = new Date();

    // Final work time calc
    if (!task.isPaused && task.lastResumedAt) {
      const workedSeconds = Math.floor(
        (now - new Date(task.lastResumedAt)) / 1000,
      );
      task.totalWorkedSeconds += workedSeconds;
    }

    task.status = "WaitingApproval";
    task.isPaused = true;
    task.pausedAt = now;
    task.lastResumedAt = null;

    await task.save();

    res.json({
      success: true,
      message: "Task sent for manager approval",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveTaskCompletion = async (req, res) => {
  try {
    if (!["Admin", "Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "Approval access denied" });
    }

    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.status !== "WaitingApproval") {
      return res
        .status(400)
        .json({ message: "Task is not waiting for approval" });
    }

    task.status = "Completed";
    task.endTime = new Date();
    task.isPaused = false;
    task.approvedBy = req.user._id;
    task.approvedAt = new Date();

    await task.save();
    await task.populate("approvedBy", "name email");

    res.json({
      success: true,
      message: "Task approved and completed",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
