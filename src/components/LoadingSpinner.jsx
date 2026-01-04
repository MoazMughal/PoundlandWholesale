const LoadingSpinner = ({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false,
  color = 'primary' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-600',
    white: 'border-white'
  };

  const spinner = (
    <div className={`loading-spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
      <div className="sr-only">Loading...</div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <div className="loading-text">{text}</div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center gap-3">
        {spinner}
        <span className="text-gray-600 font-medium">{text}</span>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;