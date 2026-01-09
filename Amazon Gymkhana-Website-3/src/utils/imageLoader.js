// Image loader utility to handle dynamic image imports

// Function to get image path from assets
export const getImagePath = (imagePath) => {
  if (!imagePath) return null
  
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath
  
  try {
    // Try to load from assets
    return new URL(`../assets/${cleanPath}`, import.meta.url).href
  } catch (error) {
    console.warn(`Image not found: ${cleanPath}`)
    return null
  }
}

// Function to get product image with fallback
export const getProductImage = (product) => {
  if (!product || !product.image) return null
  
  const imagePath = getImagePath(product.image)
  
  // If image not found, try alternative paths
  if (!imagePath) {
    // Try with different extensions or paths
    const alternatives = [
      product.image.replace('.jpg', '.jpeg'),
      product.image.replace('.jpeg', '.jpg'),
      product.image.replace('.png', '.jpg'),
    ]
    
    for (const alt of alternatives) {
      const altPath = getImagePath(alt)
      if (altPath) return altPath
    }
  }
  
  return imagePath
}

// Preload images for better performance
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
