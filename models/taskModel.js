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

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },

    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Paused", "WaitingApproval", "Completed"],
      default: "Pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    deadline: {
      type: Date,
      required: false,
    },

    notes: [
      {
        message: { type: String, trim: true },
        date: { type: Date, default: Date.now },
      },
    ],

    startTime: { type: Date },
    endTime: { type: Date },
    isPaused: { type: Boolean, default: false },
    pausedAt: { type: Date },
    lastResumedAt: { type: Date },
    totalWorkedSeconds: {
      type: Number,
      default: 0, // Total actual working time
    },
    pausedDuration: {
      type: Number,
      default: 0, // seconds
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Task = mongoose.model("Task", taskSchema);
export default Task;
