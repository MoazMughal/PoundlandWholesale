import { memo } from 'react'

const WhatsAppFloat = () => {
  return (
    <a 
      href="https://wa.me/923034928000" 
      className="whatsapp-float" 
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <i className="fab fa-whatsapp"></i>
    </a>
  )
}

export default memo(WhatsAppFloat)