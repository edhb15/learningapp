const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Enable CORS for all origins during development
app.use(cors({
  origin: '*', // We'll update this with your GitHub Pages URL once deployed
  credentials: true
}));

app.use(express.json());

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://edhb15:<db_password>@learningappcluster.twkwzmd.mongodb.net/?retryWrites=true&w=majority&appName=Learningappcluster'; // Replace <db_password> with your actual password

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In a real app, hash this password
  language: { type: String, required: true },
  progress: { type: Number, default: 0 },
  gems: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Remove local users directory (no longer needed)
// const USERS_DIR = path.join(__dirname, 'users');
// if (!fs.existsSync(USERS_DIR)) {
//   fs.mkdirSync(USERS_DIR, { recursive: true });
// }

// Remove getUserFile (no longer needed)
// function getUserFile(username) {
//   return path.join(USERS_DIR, `${username}.json`);
// }

// Add a health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Sign up
app.post('/signup', async (req, res) => {
  try {
    const { username, password, language } = req.body;
    if (!username || !password || !language) {
      return res.status(400).json({ error: 'Username, password, and language required.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const newUser = new User({
      username,
      password, // In a real app, hash this password (e.g., with bcrypt)
      language,
      progress: 0,
      gems: 0
    });
    await newUser.save();

    // Return user data without password
    const { password: _, ...userNoPassword } = newUser.toObject();
    res.json(userNoPassword);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// Log in
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.password !== password) { // In a real app, compare hashed passwords
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Ensure default values are set if not present in DB (e.g., from old data)
    user.gems = user.gems || 0;
    user.progress = user.progress || 0;

    // Return user data without password
    const { password: _, ...userNoPassword } = user.toObject();
    res.json(userNoPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Save progress
app.post('/save-progress', async (req, res) => {
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
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user data
    user.progress = progress;
    user.gems = gems;
    await user.save();

    console.log('Updated user data saved to MongoDB:', user);
    
    // Return success with the saved data
    const responseData = {
      success: true,
      savedData: {
        username: user.username,
        language: user.language,
        progress: user.progress,
        gems: user.gems
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