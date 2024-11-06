// src/app.ts
import express, { Request, Response } from 'express';
import dataProcessorRoute from './routes/data-processor';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send("Welcome to the root route!");
});

// Data processor routes
app.use('/data-processor', dataProcessorRoute);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;