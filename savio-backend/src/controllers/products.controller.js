const productService = require("../services/products.service");

exports.createProduct = (req, res) => {
    const { name, category, image } = req.body;

    const newProduct = productService.addProduct({ name, category, image });

    res.json({ success: true, data: newProduct });
};

exports.getAllProducts = (req, res) => {
    const products = productService.getAllProducts();
    res.json({ success: true, data: products });
};

exports.getProduct = (req, res) => {
    const id = parseInt(req.params.id);
    const product = productService.getProductById(id);

    if (!product)
        return res
            .status(404)
            .json({ success: false, message: "Product not found" });

    res.json({ success: true, data: product });
};

