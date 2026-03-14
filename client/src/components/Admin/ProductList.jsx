import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProductList = ({ onEdit }) => {
    const [products, setProducts] = useState([]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            // Support both old array format and new object format
            setProducts(Array.isArray(res.data) ? res.data : (res.data.products || []));
        } catch (error) {
            console.error('Error fetching products:', error);
            setProducts([]);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            await axios.delete(`/api/admin/products/${id}`);
            fetchProducts();
        }
    };

    return (
        <div className="admin-section">
            <div className="admin-header">
                <h2>Products</h2>
                <button className="btn" onClick={() => onEdit(null)}>Add New Product</button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(products) && products.map(product => (
                        <tr key={product.id}>
                            <td>
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="table-img"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/50'; }}
                                />
                            </td>
                            <td>{product.name}</td>
                            <td>{product.category_name}</td>
                            <td>${product.price}</td>
                            <td>
                                <button className="btn btn-sm" onClick={() => onEdit(product)}>Edit</button>
                                {/* Spacing */}
                                <span style={{ margin: '0 5px' }}></span>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProductList;
