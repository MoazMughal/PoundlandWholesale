import { useState, useRef, useEffect } from 'react'

const LazyImage = ({ src, alt, className, style, placeholder = 'https://via.placeholder.com/300x200?text=Loading...' }) => {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [imageRef, setImageRef] = useState()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let observer
    
    if (imageRef && imageSrc === placeholder) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src)
              observer.unobserve(imageRef)
            }
          })
        },
        { threshold: 0.1 }
      )
      observer.observe(imageRef)
    }
    
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef)
      }
    }
  }, [imageRef, imageSrc, placeholder, src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        transition: 'opacity 0.3s ease',
        opacity: isLoaded ? 1 : 0.7
      }}
      onLoad={handleLoad}
      loading="lazy"
    />
  )
}

export default LazyImage