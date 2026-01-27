import express from "express";
import {
  createClient,
  deleteClient,
  getClients,
} from "../controllers/clientController.js";
const clientRouter = express.Router();

clientRouter.post("/add-client", createClient);
clientRouter.get("/get-clients", getClients);
clientRouter.delete("/delete-client/:id", deleteClient);

export default clientRouter;
