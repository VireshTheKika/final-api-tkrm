import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "https://final-client-tkrm.vercel.app",
      "http://localhost:5000",
      "https://tkrm-client.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

//  Routes
app.get("/", (req, res) => {
  res.send("TKRM Backend API is running...");
});

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
//  Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
