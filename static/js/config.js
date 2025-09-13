// Backend API Configuration
const API_CONFIG = {
    // Change this to your deployed backend URL
    // Examples:
    // Railway: https://your-app.railway.app
    // Render: https://your-app.onrender.com
    // Heroku: https://your-app.herokuapp.com
    BACKEND_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5000'  // Local development
        : 'https://your-backend.onrender.com',  // Production backend URL

    // OpenAI API Key (optional - if you want to use client-side API calls)
    // WARNING: Exposing API keys in frontend is not secure for production
    OPENAI_API_KEY: null
};

// Export for use in other scripts
window.API_CONFIG = API_CONFIG;