import React from 'react';
import './Skeleton.css';

const Skeleton = ({ type, count = 1 }) => {
    const skeletons = Array(count).fill(0);

    const renderSkeleton = (index) => {
        if (type === 'product-card') {
            return (
                <div key={index} className="skeleton-card">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-info">
                        <div className="skeleton-line title"></div>
                        <div className="skeleton-line price"></div>
                        <div className="skeleton-button"></div>
                    </div>
                </div>
            );
        }

        if (type === 'product-details') {
            return (
                <div key={index} className="skeleton-details">
                    <div className="skeleton-details-image"></div>
                    <div className="skeleton-details-content">
                        <div className="skeleton-line h1"></div>
                        <div className="skeleton-line p"></div>
                        <div className="skeleton-line p"></div>
                        <div className="skeleton-line p"></div>
                        <div className="skeleton-button lg"></div>
                    </div>
                </div>
            );
        }

        return <div key={index} className={`skeleton-item ${type}`}></div>;
    };

    return <>{skeletons.map((_, i) => renderSkeleton(i))}</>;
};

export default Skeleton;
