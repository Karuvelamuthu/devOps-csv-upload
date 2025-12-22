const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

// For local development - store files in ./uploads directory
const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

app.use(express.static('public'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'csv-upload'
  });
});

// Upload CSV file
app.post('/upload', upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Validate CSV file
    if (!req.file.originalname.endsWith('.csv')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Only CSV files are allowed'
      });
    }

    // Create unique filename
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);

    // Move file from temp to uploads directory
    fs.copyFileSync(req.file.path, filePath);
    fs.unlinkSync(req.file.path);

    console.log(`File uploaded successfully: ${fileName}`);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileName: req.file.originalname,
      savedAs: fileName,
      size: req.file.size,
      path: filePath,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// List all uploaded files
app.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(LOCAL_UPLOAD_DIR);

    const fileDetails = files.map(fileName => {
      const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
      const stats = fs.statSync(filePath);

      return {
        fileName: fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        path: filePath
      };
    });

    res.status(200).json({
      success: true,
      message: 'Files listed successfully',
      directory: LOCAL_UPLOAD_DIR,
      fileCount: fileDetails.length,
      files: fileDetails
    });

  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message
    });
  }
});

// Get file details
app.get('/files/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);

    // Security: prevent directory traversal
    if (!filePath.startsWith(LOCAL_UPLOAD_DIR)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);

    res.status(200).json({
      success: true,
      file: {
        fileName: fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        path: filePath
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file details',
      message: error.message
    });
  }
});

// Download file
app.get('/download/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);

    // Security: prevent directory traversal
    if (!filePath.startsWith(LOCAL_UPLOAD_DIR)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.download(filePath);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
});

// Liveness probe
app.get('/live', (req, res) => {
  res.status(200).json({ live: true });
});

// Readiness probe
app.get('/ready', (req, res) => {
  try {
    if (fs.existsSync(LOCAL_UPLOAD_DIR)) {
      res.status(200).json({ ready: true, storage: 'available' });
    } else {
      res.status(503).json({ ready: false, storage: 'unavailable' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================`);
  console.log(`CSV Upload Server Started`);
  console.log(`===================================`);
  console.log(`Port: ${PORT}`);
  console.log(`Upload Directory: ${LOCAL_UPLOAD_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`===================================`);
  console.log(`Available Endpoints:`);
  console.log(`  GET  /health              - Health check`);
  console.log(`  GET  /live                - Liveness probe`);
  console.log(`  GET  /ready               - Readiness probe`);
  console.log(`  POST /upload              - Upload CSV file`);
  console.log(`  GET  /files               - List uploaded files`);
  console.log(`  GET  /files/:fileName     - Get file details`);
  console.log(`  GET  /download/:fileName  - Download file`);
  console.log(`===================================`);
});