let products = []; // temporary array before DB integration

exports.addProduct = ({ name, category, image }) => {
  const newProduct = {
    id: products.length + 1,
    name,
    category,
    image
  };

  products.push(newProduct);
  return newProduct;
};

exports.getAllProducts = () => {
  return products;
};

exports.getProductById = (id) => {
  return products.find(p => p.id === id);
};
