// Utility to get image URL from assets
// This uses a simple approach that works with Vite

export const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  
  // Remove leading slash if present
  let cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath
  
  // If path doesn't start with main-pics, assets, etc., assume it's in main-pics
  if (!cleanPath.includes('/')) {
    cleanPath = `main-pics/${cleanPath}`
  }
  
  // Return the path that Vite will resolve
  // In production, Vite will replace this with the correct hashed URL
  return `/src/assets/${cleanPath}`
}

// For direct imports (more reliable)
export const importImage = async (imagePath) => {
  try {
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath
    const module = await import(`../assets/${cleanPath}`)
    return module.default
  } catch (error) {
    console.warn(`Failed to import image: ${imagePath}`, error)
    return ''
  }
}
