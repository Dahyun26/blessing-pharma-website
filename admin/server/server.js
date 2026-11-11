
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Admin folder is one level above this server folder.
const ADMIN_DIR = path.join(__dirname, "..");

app.disable("x-powered-by");

// Allow only localhost and the office LAN (192.168.0.0/24).
app.use((req, res, next) => {
    const clientIP = (req.socket.remoteAddress || "")
        .replace(/^::ffff:/, "");

    const isLocal =
        clientIP === "127.0.0.1" ||
        clientIP === "::1";

    const isOfficeLAN =
        clientIP.startsWith("192.168.0.");

    if (!isLocal && !isOfficeLAN) {
        return res.status(403).send("Access denied. Office network only.");
    }

    next();
});

// Prevent access to server files and dependencies.
app.use((req, res, next) => {
    const requestedPath = req.path.toLowerCase();

    if (
        requestedPath === "/server" ||
        requestedPath.startsWith("/server/")
    ) {
        return res.sendStatus(404);
    }

    next();
});

// Redirect the main address to the admin login.
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Serve existing admin website files.
app.use(express.static(ADMIN_DIR, {
    index: false,
    dotfiles: "deny"
}));

// Handle unavailable pages.
app.use((req, res) => {
    res.status(404).send("Page not found.");
});

// Start the server on the local network.
app.listen(PORT, "0.0.0.0", () => {
    console.log("-----------------------------------");
    console.log("BLESSING PHARMA ADMIN SERVER");
    console.log("-----------------------------------");
    console.log(`Local: http://localhost:${PORT}/login.html`);
    console.log(`Office: http://192.168.0.102:${PORT}/login.html`);
    console.log("-----------------------------------");
});
