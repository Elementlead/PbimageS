import React, { useState, useEffect, useContext, createContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could verify token here if needed
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API}/register`, { username, email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const LoginForm = ({ isLogin, toggleMode }) => {
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin 
      ? await login(formData.username, formData.password)
      : await register(formData.username, formData.email, formData.password);

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-2">PBimage</h2>
          <h3 className="text-xl text-gray-300">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h3>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <input
              type="text"
              placeholder="Username"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          
          {!isLogin && (
            <div>
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
          
          <p className="text-center text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-green-500 hover:text-green-400 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

// Image Grid Component
const ImageGrid = ({ images, onImageClick, showSpoilers }) => {
  // Create placeholder cards to fill the grid (minimum 4 cards)
  const placeholderCount = Math.max(4 - images.length, 0);
  const placeholders = Array(placeholderCount).fill(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {/* Actual Images */}
      {images.map((image) => (
        <div
          key={image.id}
          className="relative aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-300"
          onClick={() => onImageClick(image)}
        >
          <img
            src={`data:${image.content_type};base64,${image.image_data}`}
            alt={image.caption || 'Uploaded image'}
            className={`w-full h-full object-cover transition-all duration-300 ${
              image.is_private && showSpoilers ? 'blur-md scale-110' : ''
            }`}
          />
          
          {image.is_private && showSpoilers && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">👁️</div>
                <div className="text-sm font-medium">Click to reveal</div>
              </div>
            </div>
          )}
          
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="text-white text-sm truncate">{image.caption}</div>
            </div>
          )}
          
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={`w-3 h-3 rounded-full ${image.is_private ? 'bg-red-500' : 'bg-green-500'}`}></div>
          </div>
        </div>
      ))}
      
      {/* Placeholder Cards */}
      {placeholders.map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="aspect-[3/4] bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center opacity-50"
        >
          <div className="text-gray-600 text-4xl">📷</div>
        </div>
      ))}
    </div>
  );
};

// Image Modal Component
const ImageModal = ({ image, isOpen, onClose, onDelete }) => {
  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="max-w-4xl max-h-full w-full">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img
            src={`data:${image.content_type};base64,${image.image_data}`}
            alt={image.caption || 'Image'}
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
          
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="text-white text-lg">{image.caption}</div>
              <div className="text-gray-300 text-sm mt-1">
                {image.is_private ? 'Private' : 'Public'} • {new Date(image.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-4 space-x-4">
          <button
            onClick={() => onDelete(image.id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ isOpen, onClose, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    formData.append('is_private', isPrivate);
    
    try {
      await onUpload(formData);
      setFile(null);
      setCaption('');
      setIsPrivate(false);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Upload Image</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-2">
              <div className="text-green-500 font-medium">{file.name}</div>
              <div className="text-gray-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl text-gray-500">📸</div>
              <div className="text-gray-300">Drag & drop an image here</div>
              <div className="text-gray-500 text-sm">or click to select</div>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        
        <div className="space-y-4 mt-4">
          <input
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
            />
            <label htmlFor="private" className="text-white">
              Make this image private (spoiler)
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const Main = () => {
  const { user, logout } = useAuth();
  const [images, setImages] = useState([]);
  const [showPrivate, setShowPrivate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(true);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    loadImages();
  }, [showPrivate]);

  const loadImages = async () => {
    try {
      const response = await axios.get(`${API}/images`, {
        params: showPrivate ? { private: true } : { private: false }
      });
      setImages(response.data);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleUpload = async (formData) => {
    const response = await axios.post(`${API}/images/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    loadImages();
    setCaption(''); // Clear caption after upload
  };

  const handleDelete = async (imageId) => {
    try {
      await axios.delete(`${API}/images/${imageId}`);
      setImages(images.filter(img => img.id !== imageId));
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleQuickUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', caption);
        formData.append('is_private', showPrivate);
        
        try {
          await handleUpload(formData);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Brand Name - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <h1 className="text-white text-2xl font-bold tracking-wider">PBimage</h1>
      </div>

      {/* Logout Button - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={logout}
          className="text-gray-400 hover:text-white text-sm"
        >
          Logout
        </button>
      </div>

      {/* Toggle Switch - Center Top */}
      <div className="flex justify-center pt-16 pb-8">
        <div className="flex items-center bg-gray-800 rounded-full p-1 w-48">
          <button
            onClick={() => setShowPrivate(false)}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              !showPrivate 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>👁️</span>
            <span>Public</span>
          </button>
          <button
            onClick={() => setShowPrivate(true)}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              showPrivate 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🔒</span>
            <span>Private</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-8 pb-32">
        <div className="max-w-6xl mx-auto">
          <ImageGrid 
            images={images} 
            onImageClick={setSelectedImage}
            showSpoilers={showSpoilers && showPrivate}
          />
        </div>
      </main>

      {/* Bottom Section - Caption Input and Upload Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center space-x-4">
            {/* Caption Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="ADD A CAPTION"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm tracking-wide"
              />
            </div>
            
            {/* Upload Button */}
            <button
              onClick={handleQuickUpload}
              className="w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          
          {/* Show spoilers toggle for private mode */}
          {showPrivate && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowSpoilers(!showSpoilers)}
                className="text-gray-400 hover:text-white text-xs"
              >
                {showSpoilers ? '🔒 Hide Spoilers' : '👁️ Show All'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />
      
      <ImageModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};

// App Component with Auth
const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  return (
    <AuthProvider>
      <AuthContent isLogin={isLogin} setIsLogin={setIsLogin} />
    </AuthProvider>
  );
};

const AuthContent = ({ isLogin, setIsLogin }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginForm isLogin={isLogin} toggleMode={() => setIsLogin(!isLogin)} />;
  }
  
  return <Main />;
};

export default App;