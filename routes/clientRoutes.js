import {
  createClient,
  deleteClient,
  getClients,
} from "../controllers/clientController.js";
import express from "express";
const router = express.Router();

router.post("/add-client", createClient);
router.get("/get-clients", getClients);
router.delete("/delete-client/:id", deleteClient);

export default router;
