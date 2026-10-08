import { Router, Request, Response } from 'express';
import { DriveStorage } from '../services/driveStorage';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Stream private files from Google Drive with authentication
 */
router.get('/stream/:fileId', authenticate, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID is required' });
    }

    const fileData = await DriveStorage.getFileStream(fileId);

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileData.fileName}"`);
    if (fileData.size) {
      res.setHeader('Content-Length', fileData.size);
    }

    fileData.stream.pipe(res);
  } catch (err: any) {
    console.error('File streaming error:', err);
    return res.status(404).json({ success: false, message: 'File not found or access denied' });
  }
});

export default router;
