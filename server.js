import express from 'express';
import cors from 'cors';
import roomHandler from './api/room.js';

const app = express();
app.use(cors());
app.use(express.json());

app.all('/api/room', async (req, res) => {
  try {
    await roomHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Local server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Local Vercel API simulation server running on port ${PORT}`);
});
