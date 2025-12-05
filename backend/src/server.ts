import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { startMailWatcher } from "./routes/mailWatcher.js";
dotenv.config();

import { connectDb } from "./config/db.js";
import rfpRoutes from "./routes/rfpRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/rfps", rfpRoutes);
app.use("/api/vendors", vendorRoutes);

const port = process.env.PORT || 4000;

connectDb().then(() => {
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}).catch((err: Error) => {
    console.error("DB connect error", err);
    process.exit(1);
});

const watcher = startMailWatcher({
    sendAck: true,
    fromAddress: process.env.IMAP_FROM_ADDRESS || "",
});

process.on("SIGINT", async () => {
    watcher.stop();
    process.exit(0);
});