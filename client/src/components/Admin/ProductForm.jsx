import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductForm = ({ product, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: 1,
        image_url: '',
        comfort_level: '',
        is_recommended: false,
        additional_images: [],
        variants: []
    });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories');
                setCategories(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error('Error fetching categories:', error);
                setCategories([]);
            }
        };
        fetchCategories();

        if (product) {
            setFormData({
                name: product.name,
                description: product.description,
                price: product.price,
                category_id: product.category_id,
                image_url: product.image_url,
                comfort_level: product.comfort_level || '',
                is_recommended: product.is_recommended === 1,
                additional_images: product.images?.map(img => img.image_url) || [],
                variants: product.variants || []
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddImage = () => {
        setFormData(prev => ({
            ...prev,
            additional_images: [...prev.additional_images, '']
        }));
    };

    const handleImageChange = (index, value) => {
        const newImages = [...formData.additional_images];
        newImages[index] = value;
        setFormData(prev => ({ ...prev, additional_images: newImages }));
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => ({
            ...prev,
            additional_images: prev.additional_images.filter((_, i) => i !== index)
        }));
    };

    const handleAddVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { size: '', color: '', stock: 0, sku: '' }]
        }));
    };

    const handleVariantChange = (index, field, value) => {
        const newVariants = [...formData.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };

    const handleRemoveVariant = (index) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (product) {
                await axios.put(`/api/admin/products/${product.id}`, formData);
            } else {
                await axios.post('/api/admin/products', formData);
            }
            onSave();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product');
        }
    };

    return (
        <div className="admin-section">
            <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                    <label>Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Price</label>
                    <input type="number" name="price" step="0.01" value={formData.price} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Category</label>
                    <select name="category_id" value={formData.category_id} onChange={handleChange}>
                        {Array.isArray(categories) && categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Image URL or Upload</label>
                    <div className="file-upload-wrapper" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input name="image_url" value={formData.image_url} onChange={handleChange} placeholder="Paste image URL here..." />
                        <span style={{ alignSelf: 'center' }}>OR</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const uploadFormData = new FormData();
                                    uploadFormData.append('image', file);
                                    try {
                                        const res = await axios.post('/api/admin/upload', uploadFormData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        setFormData(prev => ({ ...prev, image_url: res.data.imageUrl }));
                                    } catch (err) {
                                        console.error('Upload failed:', err);
                                        alert('Image upload failed');
                                    }
                                }
                            }}
                        />
                    </div>
                    <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                        Must be a direct link to an image (ending in .jpg, .png, etc.) or a local file.
                    </small>
                </div>
                <div className="form-group">
                    <label>Additional Images</label>
                    {formData.additional_images.map((url, index) => (
                        <div key={index} className="form-row" style={{ flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    value={url}
                                    onChange={(e) => handleImageChange(index, e.target.value)}
                                    placeholder="Image URL"
                                />
                                <button type="button" className="btn btn-secondary" onClick={() => handleRemoveImage(index)}>Remove</button>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                style={{ fontSize: '0.8rem' }}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const uploadFormData = new FormData();
                                        uploadFormData.append('image', file);
                                        try {
                                            const res = await axios.post('/api/admin/upload', uploadFormData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            handleImageChange(index, res.data.imageUrl);
                                        } catch (err) {
                                            console.error('Upload failed:', err);
                                            alert('Image upload failed');
                                        }
                                    }
                                }}
                            />
                        </div>
                    ))}
                    <button type="button" className="btn btn-secondary" onClick={handleAddImage} style={{ marginTop: '5px' }}>Add Image URL Field</button>
                </div>

                <div className="form-group">
                    <label>Variants (Size, Color, Stock, SKU)</label>
                    {formData.variants.map((variant, index) => (
                        <div key={index} className="variant-row">
                            <input
                                value={variant.size}
                                onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                                placeholder="Size"
                            />
                            <input
                                value={variant.color}
                                onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                                placeholder="Color"
                            />
                            <input
                                type="number"
                                value={variant.stock}
                                onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value))}
                                placeholder="Stock"
                            />
                            <input
                                value={variant.sku}
                                onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                                placeholder="SKU"
                            />
                            <button type="button" className="btn btn-secondary" onClick={() => handleRemoveVariant(index)}>Remove</button>
                        </div>
                    ))}
                    <button type="button" className="btn btn-secondary" onClick={handleAddVariant}>Add Variant</button>
                </div>

                <div className="form-group">
                    <label>Comfort Level</label>
                    <input name="comfort_level" value={formData.comfort_level} onChange={handleChange} placeholder="e.g. High, Medium" />
                </div>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="is_recommended" checked={formData.is_recommended} onChange={handleChange} />
                        Recommended Product
                    </label>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn">Save</button>
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
