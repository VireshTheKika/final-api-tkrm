import Client from "../models/Client.js";

export const createClient = async (req, res) => {
  try {
    const { name } = req.body;
    const newClient = new Client({ name });
    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ message: "Failed to create client" });
  }
};

export const getClients = async (req, res) => {
 try {
    const clients = await Client.find();
    return res.status(200).json(clients);
 } catch (error) {
    return res.status(500).json({message:"failed to fetch clients"})
 }
};

export const deleteClient = async (req, res) => {
  try {
    const clients = await Client.findByIdAndDelete(req.params.id);
    if (!clients) return res.status(404).json({ message: "client not found" });

    res.json({ success: true, message: "client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: error.message });
  }
};
