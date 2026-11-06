import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import profileRoutes, { profileMiddleware } from './routes/profile.js';
import paymentRoutes, { paystackWebhook } from './routes/payments.js';

const { MONGO_URI, JWT_SECRET, MONGO_DB_NAME } = process.env;
const PORT = Number(process.env.PORT) || 5000;

if (!MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to server/.env (see .env.example).');
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short (use at least 32 random characters). Add it to server/.env.');
  process.exit(1);
}

if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn('PAYSTACK_SECRET_KEY is missing, so payments are switched off. Add it to server/.env (see .env.example).');
}

const app = express();
// Render (like most hosts) puts a proxy in front of the app. Without this, every visitor looks like the same
// IP address to the rate limiters, so they would all share one limit.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

// The web app and the Android (Capacitor) WebView are the only places allowed to call this API.
// Set CLIENT_ORIGIN (comma-separated, no trailing slashes) on Render to override this list.
const DEFAULT_ORIGINS = [
  'https://remopdf.site',
  'https://www.remopdf.site',
  'https://localhost', // Android WebView (Capacitor 6+)
  'http://localhost', // Android WebView (older Capacitor)
  'capacitor://localhost', // iOS WebView
  'http://localhost:5173', // Vite dev server
].join(',');
const allowedOrigins = (process.env.CLIENT_ORIGIN || DEFAULT_ORIGINS)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = curl, health checks, server-to-server. Browsers always send one.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('Origin not allowed.'), { status: 403 }));
    },
  })
);

// Paystack's webhook is signed over the exact bytes it sends, so it needs the raw body. It is mounted BEFORE
// express.json() below, which would otherwise parse (and change) the body first.
app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '100kb' }), paystackWebhook);

// The resume (with its photo) is much bigger than a login form, so /api/profile gets its own larger body
// limit. It is mounted BEFORE the small global limit below, and only for signed-in requests (the middleware
// checks the token before it reads the body).
app.use('/api/profile', ...profileMiddleware, profileRoutes);

app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'not connected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Last stop for errors: never leak internals to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  if (err.status === 403) return res.status(403).json({ message: err.message });
  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
});

// MONGO_DB_NAME (optional) picks the database by name, whatever MONGO_URI ends with. Without it, the database named in
// MONGO_URI is used (or "test" if the URI names none). MongoDB creates the database and collections on the first save.
const dbName = (MONGO_DB_NAME || '').trim();

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000, ...(dbName ? { dbName } : {}) })
  .then(() => {
    console.log(`Connected to MongoDB (database "${mongoose.connection.name}")`);
    app.listen(PORT, () => console.log(`RemoPDF server listening on port ${PORT}`));
  })
  .catch((err) => {
    // Print only the reason, never the connection string.
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });