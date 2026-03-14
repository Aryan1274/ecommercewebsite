import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import './Category.css'; // Reusing Category styles

const Search = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // Filter states
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [comfortLevel, setComfortLevel] = useState('');
    const [sort, setSort] = useState('newest');

    useEffect(() => {
        const fetchSearchResults = async () => {
            setLoading(true);
            try {
                const params = {
                    search: query,
                    minPrice,
                    maxPrice,
                    comfortLevel,
                    sort,
                    page: currentPage,
                    limit: 9
                };
                const res = await axios.get('/api/products', { params });
                setProducts(res.data.products || []);
                setTotalPages(res.data.totalPages || 1);
                setTotalResults(res.data.totalCount || 0);
            } catch (error) {
                console.error('Error fetching search results:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSearchResults();
    }, [query, minPrice, maxPrice, comfortLevel, sort, currentPage]);

    const handleApplyFilters = (e) => {
        e.preventDefault();
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="category-page search-page">
            <div className="category-page-container">
                <aside className="filter-sidebar">
                    <div className="filter-section">
                        <h3>Price Range</h3>
                        <form onSubmit={handleApplyFilters} className="filter-group">
                            <div className="price-inputs">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                />
                                <span>-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                />
                            </div>
                        </form>
                    </div>

                    <div className="filter-section">
                        <h3>Comfort Level</h3>
                        <div className="filter-group">
                            {['All', 'Soft', 'Firm', 'Plush', 'Memory Foam'].map(level => (
                                <label key={level}>
                                    <input
                                        type="radio"
                                        name="comfortLevel"
                                        value={level === 'All' ? '' : level}
                                        checked={comfortLevel === (level === 'All' ? '' : level)}
                                        onChange={(e) => setComfortLevel(e.target.value)}
                                    />
                                    {level}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-sm" onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setComfortLevel('');
                        setSort('newest');
                        setCurrentPage(1);
                    }}>Clear All Filters</button>
                </aside>

                <main className="category-content">
                    <header className="category-header">
                        <div className="header-info">
                            <h1 className="category-title">Search Results for "{query}"</h1>
                            <p className="results-count">{totalResults} products found</p>
                        </div>
                        <div className="sort-controls">
                            <select value={sort} onChange={(e) => setSort(e.target.value)} className="sort-select">
                                <option value="newest">Newest First</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </header>

                    {loading ? (
                        <div className="loading-grid">
                            <p>Loading results...</p>
                        </div>
                    ) : (
                        <>
                            {products.length === 0 ? (
                                <div className="no-results">
                                    <p>No products found for your search.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="product-grid">
                                        {Array.isArray(products) && products.map(product => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="pagination">
                                            <button
                                                className="pagination-btn"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                            <span className="page-info">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                className="pagination-btn"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Search;
