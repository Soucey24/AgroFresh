import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4002; // Different port to avoid conflicts

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route to list available images
app.get('/debug-images', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  try {
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    const imageList = imageFiles.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/uploads/${file}`,
      size: fs.statSync(path.join(uploadsDir, file)).size,
      lastModified: fs.statSync(path.join(uploadsDir, file)).mtime
    }));
    
    res.json({
      message: 'Image debugging information',
      uploadsDirectory: uploadsDir,
      totalImages: imageFiles.length,
      images: imageList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to check if a specific image exists
app.get('/test-image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(imagePath)) {
    const stats = fs.statSync(imagePath);
    res.json({
      exists: true,
      filename,
      size: stats.size,
      lastModified: stats.mtime,
      url: `http://localhost:${PORT}/uploads/${filename}`
    });
  } else {
    res.json({
      exists: false,
      filename,
      error: 'File not found'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔍 Image debug server running on http://localhost:${PORT}`);
  console.log(`📋 Debug info: http://localhost:${PORT}/debug-images`);
  console.log(`🖼️  Test specific image: http://localhost:${PORT}/test-image/FILENAME`);
}); 