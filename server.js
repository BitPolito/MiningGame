import express from 'express';
import cors from 'cors';
import roomHandler from './api/room.js';
import healthHandler from './api/health.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Local server error' });
  }
});

app.all('/api/room', async (req, res) => {
  try {
    await roomHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Local server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Local Vercel API simulation server running on port ${PORT}`);
});
