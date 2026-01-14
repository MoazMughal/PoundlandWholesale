import { useState, useEffect } from 'react';
import LazyImage from '../components/LazyImage';
import { getImageUrl } from '../utils/imageImports';
import { getOptimizedCloudinaryUrl, isCloudinaryUrl } from '../utils/cloudinary';

const ImageSystemTest = () => {
  const [testResults, setTestResults] = useState({});
  const [sampleProducts, setSampleProducts] = useState([]);
  const [cloudinaryStatus, setCloudinaryStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    
    try {
      // Test 1: Check Cloudinary status
      const statusResponse = await fetch('/api/image-test/cloudinary-status');
      const statusData = await statusResponse.json();
      setCloudinaryStatus(statusData);

      // Test 2: Get sample products
      const productsResponse = await fetch('/api/image-test/sample-products?imageWidth=300&imageHeight=300');
      const productsData = await productsResponse.json();
      setSampleProducts(productsData.data?.regularProducts || []);

      // Test 3: Test image URL functions
      const testUrls = [
        'https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/B08N5WRWNW.jpg',
        'B08N5WRWNW',
        'https://via.placeholder.com/300x300?text=Test',
        '/api/admin-excel/public/images/by-asin/B08N5WRWNW'
      ];

      const urlTests = {};
      testUrls.forEach((url, index) => {
        urlTests[`test_${index}`] = {
          original: url,
          isCloudinary: isCloudinaryUrl(url),
          optimized: getImageUrl(url, { width: 300, height: 300 }),
          cloudinaryOptimized: isCloudinaryUrl(url) ? getOptimizedCloudinaryUrl(url, { width: 300, height: 300 }) : 'N/A'
        };
      });

      setTestResults(urlTests);

    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testImageLoad = (src) => {
    const startTime = performance.now();
    const img = new Image();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      console.log(`✅ Image loaded in ${loadTime.toFixed(2)}ms:`, src);
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load image:', src);
    };
    
    img.src = src;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Running image system tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🖼️ Image System Test Dashboard</h1>

      {/* Cloudinary Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📊 Cloudinary Integration Status</h2>
        {cloudinaryStatus && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium mb-2">Products</h3>
              <div className="text-sm space-y-1">
                <div>Total: {cloudinaryStatus.stats.totalProducts}</div>
                <div>With Images: {cloudinaryStatus.stats.productsWithImages}</div>
                <div className="text-green-600">Cloudinary: {cloudinaryStatus.stats.cloudinaryImages}</div>
                <div className="text-orange-600">Local: {cloudinaryStatus.stats.localImages}</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium mb-2">Excel Products</h3>
              <div className="text-sm space-y-1">
                <div>Total: {cloudinaryStatus.stats.excelProducts}</div>
                <div>With Images: {cloudinaryStatus.stats.excelWithImages}</div>
                <div className="text-green-600">Cloudinary: {cloudinaryStatus.stats.excelCloudinaryImages}</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium mb-2">Status</h3>
              <div className="text-sm space-y-1">
                <div className={cloudinaryStatus.recommendations.migrationReady ? 'text-green-600' : 'text-red-600'}>
                  {cloudinaryStatus.recommendations.migrationReady ? '✅' : '❌'} Migration Ready
                </div>
                <div className={cloudinaryStatus.recommendations.bulkUploadReady ? 'text-green-600' : 'text-red-600'}>
                  {cloudinaryStatus.recommendations.bulkUploadReady ? '✅' : '❌'} Bulk Upload Ready
                </div>
                <div className={!cloudinaryStatus.recommendations.needsMigration ? 'text-green-600' : 'text-orange-600'}>
                  {!cloudinaryStatus.recommendations.needsMigration ? '✅' : '⚠️'} 
                  {cloudinaryStatus.recommendations.needsMigration ? ' Needs Migration' : ' No Migration Needed'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* URL Processing Tests */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">🔗 URL Processing Tests</h2>
        <div className="space-y-4">
          {Object.entries(testResults).map(([key, result]) => (
            <div key={key} className="bg-white p-4 rounded border">
              <h3 className="font-medium mb-2">Test {key.split('_')[1]}</h3>
              <div className="text-sm space-y-1">
                <div><strong>Original:</strong> <code className="bg-gray-100 px-1 rounded">{result.original}</code></div>
                <div><strong>Is Cloudinary:</strong> {result.isCloudinary ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Processed:</strong> <code className="bg-gray-100 px-1 rounded">{result.optimized}</code></div>
                <div><strong>Cloudinary Opt:</strong> <code className="bg-gray-100 px-1 rounded">{result.cloudinaryOptimized}</code></div>
                <button 
                  onClick={() => testImageLoad(result.optimized)}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Test Load Speed
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Products Display */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📦 Sample Products Test</h2>
        {sampleProducts.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {sampleProducts.map((product, index) => (
              <div key={product._id || index} className="bg-white rounded-lg shadow p-4">
                <div className="mb-3">
                  <LazyImage
                    src={getImageUrl(product.images?.[0] || product.image, { width: 200, height: 200 })}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded"
                    width={200}
                    height={200}
                    quality="auto"
                  />
                </div>
                <h3 className="font-medium text-sm mb-1 truncate">{product.name}</h3>
                <p className="text-xs text-gray-600 mb-1">ASIN: {product.asin || 'N/A'}</p>
                <p className="text-xs text-gray-600 mb-2">£{product.price}</p>
                <div className="text-xs">
                  <div className="mb-1">
                    <strong>Images:</strong> {product.images?.length || 0}
                  </div>
                  {product.images?.[0] && (
                    <div className="mb-1">
                      <strong>URL:</strong> 
                      <code className="bg-gray-100 px-1 rounded text-xs break-all">
                        {product.images[0].substring(0, 50)}...
                      </code>
                    </div>
                  )}
                  <div className={`px-2 py-1 rounded text-xs ${
                    product.images?.[0]?.includes('cloudinary.com') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {product.images?.[0]?.includes('cloudinary.com') ? '✅ Cloudinary' : '⚠️ Not Cloudinary'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sample products found. Try running the migration or adding some products.
          </div>
        )}
      </div>

      {/* Performance Test */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">⚡ Performance Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">✅ Active Features</h3>
            <ul className="text-sm space-y-1">
              <li>• Lazy loading with Intersection Observer</li>
              <li>• Cloudinary URL optimization</li>
              <li>• Mobile-specific image sizes</li>
              <li>• Automatic format detection (WebP, AVIF)</li>
              <li>• Error handling and fallbacks</li>
              <li>• Image load performance monitoring</li>
              <li>• Responsive image support</li>
              <li>• Backend middleware optimization</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">📈 Expected Benefits</h3>
            <ul className="text-sm space-y-1">
              <li>• 60-80% faster image loading</li>
              <li>• Reduced server bandwidth usage</li>
              <li>• Better mobile performance</li>
              <li>• Global CDN distribution</li>
              <li>• Automatic image compression</li>
              <li>• Improved SEO scores</li>
              <li>• Better user experience</li>
              <li>• Reduced server costs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 text-center space-x-4">
        <button 
          onClick={runTests}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Re-run Tests
        </button>
        <button 
          onClick={() => window.open('/test-cloudinary-setup.html', '_blank')}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          🧪 Open Setup Test
        </button>
      </div>
    </div>
  );
};

export default ImageSystemTest;