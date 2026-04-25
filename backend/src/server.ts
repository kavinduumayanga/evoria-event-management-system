import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Force keep-alive for debugging
setInterval(() => {}, 1000 * 60 * 60);
