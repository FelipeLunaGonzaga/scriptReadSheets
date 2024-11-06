// routes/data-processor.ts
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.send("Hello, world!");
});

router.post('/', (req: Request, res: Response) => {
  console.log(req.body);

  const directoryPath = path.join(__dirname, '01 JANUARY 2024');
  if (fs.existsSync(directoryPath)) {
    // readSpreadsheetsInDirectory(directoryPath);

    setTimeout(() => {
      // exportDataToCSV();
      res.send('Data processing completed and CSV exported.');
    }, 5000);
  } else {
    res.status(404).send('Specified directory does not exist.');
  }
});

export default router;