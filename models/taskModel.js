import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    status: {
      type: String,
      enum: ["Ongoing", "Completed"],
      default: "Ongoing",
    },

    // 🗓️ Deadline for task completion
    deadline: {
      type: Date,
      required: false, // optional field
    },

    // 💬 Notes added by employees or managers
    notes: [
      {
        message: { type: String, trim: true },
        date: { type: Date, default: Date.now },
      },
    ],

    // 👷 Assigned employee
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🧑‍💼 Manager/Admin who assigned the task
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;
