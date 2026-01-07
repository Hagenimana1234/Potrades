import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from '../utils/redis';

// Configure session store with Redis for horizontal scaling
export const sessionStore = new RedisStore({
  client: redis,
  prefix: 'potrades:sess:',
  ttl: parseInt(process.env.SESSION_MAX_AGE || '604800'), // 7 days in seconds
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on each request
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.SESSION_SECURE === 'true',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 days in milliseconds
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  name: 'potrades.sid', // Custom session cookie name
});

export default sessionMiddleware;
