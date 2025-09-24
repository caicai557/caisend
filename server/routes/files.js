const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { File, Message, ChatMember } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const type = file.mimetype.split('/')[0];
    const uploadDir = path.join(__dirname, '..', 'uploads', type === 'image' ? 'images' : type === 'video' ? 'videos' : 'files');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/zip',
      'text/plain', 'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { chat_id, message_id } = req.body;

    // Verify user has access to chat if chat_id provided
    if (chat_id) {
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id,
          user_id: req.user.id
        }
      });

      if (!chatMember || !chatMember.permissions.send_media) {
        // Delete uploaded file
        await fs.unlink(req.file.path);
        return res.status(403).json({ message: 'Permission denied' });
      }
    }

    const fileType = req.file.mimetype.split('/')[0];
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);
    
    // Create thumbnail for images and videos
    let thumbnailPath = null;
    let metadata = {};

    if (fileType === 'image') {
      try {
        const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
        await fs.mkdir(thumbnailDir, { recursive: true });
        
        const thumbnailName = `thumb_${req.file.filename}`;
        thumbnailPath = path.join(thumbnailDir, thumbnailName);
        
        const image = sharp(req.file.path);
        const imageMetadata = await image.metadata();
        
        metadata = {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format
        };

        await image
          .resize(200, 200, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
          
        thumbnailPath = path.relative(path.join(__dirname, '..'), thumbnailPath);
      } catch (err) {
        console.error('Thumbnail generation error:', err);
      }
    }

    // Create file record
    const file = await File.create({
      message_id,
      uploaded_by: req.user.id,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      path: relativePath,
      thumbnail_path: thumbnailPath,
      width: metadata.width,
      height: metadata.height,
      metadata
    });

    res.json({
      message: 'File uploaded successfully',
      file: {
        id: file.id,
        url: `/${relativePath}`,
        thumbnail_url: thumbnailPath ? `/${thumbnailPath}` : null,
        filename: file.filename,
        original_name: file.original_name,
        mime_type: file.mime_type,
        size: file.size,
        metadata: file.metadata
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
    
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { chat_id } = req.body;

    // Verify user has access to chat
    if (chat_id) {
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id,
          user_id: req.user.id
        }
      });

      if (!chatMember || !chatMember.permissions.send_media) {
        // Delete uploaded files
        for (const file of req.files) {
          await fs.unlink(file.path);
        }
        return res.status(403).json({ message: 'Permission denied' });
      }
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = file.mimetype.split('/')[0];
      const relativePath = path.relative(path.join(__dirname, '..'), file.path);
      
      let thumbnailPath = null;
      let metadata = {};

      if (fileType === 'image') {
        try {
          const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
          await fs.mkdir(thumbnailDir, { recursive: true });
          
          const thumbnailName = `thumb_${file.filename}`;
          thumbnailPath = path.join(thumbnailDir, thumbnailName);
          
          const image = sharp(file.path);
          const imageMetadata = await image.metadata();
          
          metadata = {
            width: imageMetadata.width,
            height: imageMetadata.height,
            format: imageMetadata.format
          };

          await image
            .resize(200, 200, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
            
          thumbnailPath = path.relative(path.join(__dirname, '..'), thumbnailPath);
        } catch (err) {
          console.error('Thumbnail generation error:', err);
        }
      }

      const fileRecord = await File.create({
        uploaded_by: req.user.id,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: relativePath,
        thumbnail_path: thumbnailPath,
        width: metadata.width,
        height: metadata.height,
        metadata
      });

      uploadedFiles.push({
        id: fileRecord.id,
        url: `/${relativePath}`,
        thumbnail_url: thumbnailPath ? `/${thumbnailPath}` : null,
        filename: fileRecord.filename,
        original_name: fileRecord.original_name,
        mime_type: fileRecord.mime_type,
        size: fileRecord.size,
        metadata: fileRecord.metadata
      });
    }

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Failed to delete file:', err);
        }
      }
    }
    
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// Get file info
router.get('/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findByPk(req.params.fileId, {
      include: [{
        model: Message,
        as: 'message',
        attributes: ['chat_id']
      }]
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user has access to the file
    if (file.message) {
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: file.message.chat_id,
          user_id: req.user.id
        }
      });

      if (!chatMember) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({
      id: file.id,
      url: `/${file.path}`,
      thumbnail_url: file.thumbnail_path ? `/${file.thumbnail_path}` : null,
      filename: file.filename,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size: file.size,
      metadata: file.metadata,
      uploaded_at: file.created_at
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Failed to get file info' });
  }
});

// Download file
router.get('/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const file = await File.findByPk(req.params.fileId, {
      include: [{
        model: Message,
        as: 'message',
        attributes: ['chat_id']
      }]
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user has access to the file
    if (file.message) {
      const chatMember = await ChatMember.findOne({
        where: {
          chat_id: file.message.chat_id,
          user_id: req.user.id
        }
      });

      if (!chatMember) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filePath = path.join(__dirname, '..', file.path);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.download(filePath, file.original_name);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findByPk(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user can delete the file
    if (file.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Delete physical files
    try {
      await fs.unlink(path.join(__dirname, '..', file.path));
      if (file.thumbnail_path) {
        await fs.unlink(path.join(__dirname, '..', file.thumbnail_path));
      }
    } catch (err) {
      console.error('Failed to delete physical files:', err);
    }

    await file.destroy();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

module.exports = router;