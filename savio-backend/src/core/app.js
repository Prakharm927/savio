const express = require("express");
const app = express();

// IMPORTANT: JSON parser middleware
app.use(express.json());

// HEALTH CHECK
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// ROUTES
app.use("/products", require("../routes/products.routes"));

// NOTE: These route files are currently empty, so mounting them causes
// "TypeError: argument handler must be a function" from Express.
// Uncomment these once you implement and export a proper router from each file.
// app.use("/stores", require("../routes/stores.routes"));
// app.use("/prices", require("../routes/prices.routes"));
// app.use("/compare", require("../routes/comparison.routes"));
// app.use("/users", require("../routes/users.routes"));

module.exports = app;

