import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireOrg } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = Router();

// Local storage fallback when S3 not configured
const localUploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: localUploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime',
      'audio/mpeg', 'audio/ogg', 'audio/wav',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

router.post('/file', authenticate, requireOrg, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // If S3 configured, upload there
    if (process.env.AWS_S3_BUCKET) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const key = `uploads/${uuidv4()}${path.extname(req.file.originalname)}`;
      const fileBuffer = fs.readFileSync(req.file.path);

      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: req.file.mimetype,
      }));

      fs.unlinkSync(req.file.path);

      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
      return res.json({
        url: fileUrl,
        key,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    }

    // Local storage response
    const fileUrl = `${process.env.API_URL || 'http://localhost:4000'}/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      key: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/presigned', authenticate, requireOrg, async (req, res, next) => {
  try {
    if (!process.env.AWS_S3_BUCKET) {
      return res.status(503).json({ error: 'S3 not configured' });
    }

    const { filename, mimeType } = req.body;
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const key = `uploads/${uuidv4()}${path.extname(filename)}`;

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key, ContentType: mimeType }),
      { expiresIn: 300 }
    );

    res.json({ uploadUrl: url, key, publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}` });
  } catch (error) {
    next(error);
  }
});

export default router;
