import { useState } from 'react';
import { getOptimizedCloudinaryUrl } from '../utils/cloudinary';

const BulkUploadCloudinary = () => {
  const [files, setFiles] = useState({ excel: null, images: null });
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (type, event) => {
    const file = event.target.files[0];
    setFiles(prev => ({ ...prev, [type]: file }));
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.excel || !files.images) {
      setError('Please select both Excel file and images ZIP file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('excel', files.excel);
      formData.append('images', files.images);

      const response = await fetch('/api/bulk-upload/excel-with-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.results);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFiles({ excel: null, images: null });
    setUploadResult(null);
    setError(null);
    // Reset file inputs
    document.getElementById('excel-file').value = '';
    document.getElementById('images-file').value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Bulk Upload with Cloudinary
      </h2>
      
      <div className="space-y-6">
        {/* File Upload Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Excel File (.xlsx, .xls)
            </label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange('excel', e)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files.excel && (
              <p className="text-sm text-green-600">
                ✓ {files.excel.name} ({(files.excel.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Images ZIP Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Images ZIP File
            </label>
            <input
              id="images-file"
              type="file"
              accept=".zip"
              onChange={(e) => handleFileChange('images', e)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {files.images && (
              <p className="text-sm text-green-600">
                ✓ {files.images.name} ({(files.images.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Excel file must contain ASIN column for product identification</li>
            <li>• ZIP file should contain images named with ASIN (e.g., B08N5WRWNW.jpg)</li>
            <li>• Images will be uploaded to Cloudinary and optimized automatically</li>
            <li>• Supported image formats: JPG, JPEG, PNG, WebP, GIF</li>
            <li>• Products will be stored in database with Cloudinary URLs</li>
          </ul>
        </div>

        {/* Upload Button */}
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={!files.excel || !files.images || uploading}
            className={`px-6 py-3 rounded-lg font-semibold ${
              !files.excel || !files.images || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Uploading...' : 'Start Upload'}
          </button>
          
          <button
            onClick={resetForm}
            className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Reset
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
              <div>
                <p className="text-yellow-800 font-semibold">Processing Upload...</p>
                <p className="text-yellow-700 text-sm">
                  Reading Excel file, extracting images, and uploading to Cloudinary
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-green-800 font-bold text-lg mb-4">Upload Complete!</h3>
            
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.totalProducts}
                </div>
                <div className="text-sm text-green-700">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.processedProducts}
                </div>
                <div className="text-sm text-blue-700">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {uploadResult.uploadedImages}
                </div>
                <div className="text-sm text-purple-700">Images Uploaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {uploadResult.matchedImages}
                </div>
                <div className="text-sm text-orange-700">Images Matched</div>
              </div>
            </div>

            {/* Sample Products */}
            {uploadResult.products && uploadResult.products.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-800 mb-3">Sample Products:</h4>
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {uploadResult.products.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded border">
                      {product.imageUrl && (
                        <img
                          src={getOptimizedCloudinaryUrl(product.imageUrl, { width: 60, height: 60 })}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ASIN: {product.asin} | £{product.price}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {product.hasImage ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Image
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ No Image
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-800 mb-2">
                  Errors ({uploadResult.errors.length}):
                </h4>
                <div className="bg-red-50 p-3 rounded max-h-40 overflow-y-auto">
                  {uploadResult.errors.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-sm text-red-700 mb-1">
                      {error}
                    </p>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <p className="text-sm text-red-600 font-medium">
                      ... and {uploadResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadCloudinary;