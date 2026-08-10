const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const organizerRoutes = require("./routes/organizer");
const ticketRoutes = require("./routes/tickets");
const attendanceRoutes = require("./routes/attendance");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");
const { errorHandler } = require("./middleware/errorHandler");

const server = express();
server.use(cors());
server.use(express.json({ limit: "10mb" }));

server.use("/auth", authRoutes);
server.use("/events", eventRoutes);
server.use("/organizer", organizerRoutes);
server.use("/tickets", ticketRoutes);
server.use("/attendance", attendanceRoutes);
server.use("/admin", adminRoutes);
server.use("/user", userRoutes);

server.use(errorHandler);

server.listen(3000, () => console.log("Server running on port 3000"));
