const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get photos for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const photos = await req.prisma.eventPhoto.findMany({
      where: { eventId: req.params.eventId },
      include: { uploader: { select: { name: true } } },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get public photos for an event (for client portal)
router.get('/event/:eventId/public', async (req, res) => {
  try {
    const photos = await req.prisma.eventPhoto.findMany({
      where: {
        eventId: req.params.eventId,
        isPublic: true
      },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { eventId, caption, isPublic, uploadedBy } = req.body;

    const photo = await req.prisma.eventPhoto.create({
      data: {
        eventId,
        filename: req.file.filename,
        url: `/uploads/photos/${req.file.filename}`,
        caption,
        isPublic: isPublic === 'true',
        uploadedBy
      },
      include: { uploader: { select: { name: true } } }
    });

    res.status(201).json(photo);
  } catch (error) {
    // Clean up uploaded file if database insert fails
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple photos
router.post('/upload-multiple', upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { eventId, uploadedBy } = req.body;

    const photos = await Promise.all(
      req.files.map(file =>
        req.prisma.eventPhoto.create({
          data: {
            eventId,
            filename: file.filename,
            url: `/uploads/photos/${file.filename}`,
            isPublic: false,
            uploadedBy
          }
        })
      )
    );

    res.status(201).json(photos);
  } catch (error) {
    // Clean up uploaded files if database insert fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update photo (caption, isPublic)
router.put('/:id', async (req, res) => {
  try {
    const { caption, isPublic } = req.body;

    const photo = await req.prisma.eventPhoto.update({
      where: { id: req.params.id },
      data: { caption, isPublic },
      include: { uploader: { select: { name: true } } }
    });

    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/:id', async (req, res) => {
  try {
    const photo = await req.prisma.eventPhoto.findUnique({
      where: { id: req.params.id }
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete file from disk
    const filePath = path.join(uploadsDir, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await req.prisma.eventPhoto.delete({ where: { id: req.params.id } });

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photo by ID
router.get('/:id', async (req, res) => {
  try {
    const photo = await req.prisma.eventPhoto.findUnique({
      where: { id: req.params.id },
      include: {
        event: { select: { name: true } },
        uploader: { select: { name: true } }
      }
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
