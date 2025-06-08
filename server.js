const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Enable CORS for all origins during development
app.use(cors({
  origin: '*', // We'll update this with your GitHub Pages URL once deployed
  credentials: true
}));

app.use(express.json());

// Create users directory if it doesn't exist
const USERS_DIR = path.join(__dirname, 'users');
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

function getUserFile(username) {
  return path.join(USERS_DIR, `${username}.json`);
}

// Add a health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Sign up
app.post('/signup', (req, res) => {
  try {
    const { username, password, language } = req.body;
    if (!username || !password || !language) {
      return res.status(400).json({ error: 'Username, password, and language required.' });
    }
    const userFile = getUserFile(username);
    if (fs.existsSync(userFile)) {
      return res.status(409).json({ error: 'User already exists.' });
    }
    // Initialize new user with default values
    const userData = {
      username,
      password,
      language,
      progress: 0,
      gems: 0
    };
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    // Return user data without password
    const { password: _, ...userNoPassword } = userData;
    res.json(userNoPassword);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// Log in
app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    const userFile = getUserFile(username);
    if (!fs.existsSync(userFile)) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    if (userData.password !== password) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    
    // Initialize default values if they don't exist
    if (typeof userData.gems !== 'number') userData.gems = 0;
    
    // Save the updated data if any defaults were added
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    
    // Log the data being sent back
    console.log('Sending user data:', {
      username: userData.username,
      language: userData.language,
      progress: userData.progress,
      gems: userData.gems
    });
    
    // Don't send password back to client
    const { password: _, ...userNoPassword } = userData;
    res.json(userNoPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Save progress
app.post('/save-progress', (req, res) => {
  try {
    console.log('Received save-progress request body:', req.body);
    
    const { username, progress, gems } = req.body;
    
    // Validate required fields
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (typeof progress !== 'number') {
      return res.status(400).json({ error: 'Invalid progress value' });
    }
    if (typeof gems !== 'number') {
      return res.status(400).json({ error: 'Invalid gems value' });
    }
    
    const userFile = getUserFile(username);
    if (!fs.existsSync(userFile)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Read existing user data
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    console.log('Current user data:', userData);
    
    // Create new user data object with all fields
    const updatedUserData = {
      ...userData,  // Keep existing fields like password
      progress: progress,
      gems: gems
    };
    
    console.log('Updated user data to save:', updatedUserData);
    
    // Save the updated data
    const updatedData = JSON.stringify(updatedUserData, null, 2);
    fs.writeFileSync(userFile, updatedData);
    
    // Verify the data was saved correctly
    const savedData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    console.log('Verified saved data:', savedData);
    
    // Return success with the saved data
    const responseData = {
      success: true,
      savedData: {
        username: savedData.username,
        language: savedData.language,
        progress: savedData.progress,
        gems: savedData.gems
      }
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Internal server error while saving progress' });
  }
});

// Use environment variable for port if available (for Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 