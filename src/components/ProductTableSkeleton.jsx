import React from 'react';
import '../styles/skeleton-loader.css';

const ProductTableSkeleton = ({ rows = 10 }) => {
  return (
    <div className="products-table-skeleton">
      <table className="skeleton-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '60px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '300px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '110px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '110px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '120px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '80px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '80px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '70px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '90px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '100px' }}><div className="skeleton-box" /></th>
            <th style={{ width: '280px' }}><div className="skeleton-box" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} style={{ animationDelay: `${index * 0.05}s` }}>
              <td><div className="skeleton-box skeleton-checkbox" /></td>
              <td><div className="skeleton-box skeleton-image" /></td>
              <td><div className="skeleton-box skeleton-text skeleton-text-long" /></td>
              <td><div className="skeleton-box skeleton-text" /></td>
              <td><div className="skeleton-box skeleton-text" /></td>
              <td><div className="skeleton-box skeleton-text" /></td>
              <td><div className="skeleton-box skeleton-text skeleton-text-short" /></td>
              <td><div className="skeleton-box skeleton-text skeleton-text-short" /></td>
              <td><div className="skeleton-box skeleton-text skeleton-text-short" /></td>
              <td><div className="skeleton-box skeleton-badge" /></td>
              <td><div className="skeleton-box skeleton-text" /></td>
              <td>
                <div className="skeleton-actions">
                  <div className="skeleton-box skeleton-button" />
                  <div className="skeleton-box skeleton-button" />
                  <div className="skeleton-box skeleton-button" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTableSkeleton;
