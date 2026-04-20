const express = require("express");
const router = express.Router();
const controller = require("../controllers/products.controller");

router.post("/", controller.createProduct);
router.get("/", controller.getAllProducts);
router.get("/:id", controller.getProduct);

module.exports = router;

