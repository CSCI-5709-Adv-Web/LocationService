import express from 'express';
import locationRoutes from './routes/location.routes';
import { httpLogger } from './utils/logger';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());
app.use(httpLogger);  // Middleware for logging HTTP requests

app.use('/api/location', locationRoutes);

export default app;
