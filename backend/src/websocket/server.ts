import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from '../utils/crypto';
import marketDataService from '../services/marketData.service';
import logger from '../utils/logger';

export class WebSocketServer {
  private io: SocketIOServer;
  private redisInitialized: boolean = false;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      // Enable clustering support
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
    });

    this.setupRedisAdapter().then(() => {
      this.setupMiddleware();
      this.setupEventHandlers();
    });
  }

  /**
   * Setup Redis adapter for horizontal scaling across multiple instances
   */
  private async setupRedisAdapter() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Create Redis clients for pub/sub
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      // Handle Redis errors
      pubClient.on('error', (err) => logger.error('Redis Pub Client Error:', err));
      subClient.on('error', (err) => logger.error('Redis Sub Client Error:', err));

      // Connect clients
      await Promise.all([pubClient.connect(), subClient.connect()]);

      // Use Redis adapter for WebSocket clustering
      this.io.adapter(createAdapter(pubClient, subClient));

      logger.info('✓ WebSocket clustering enabled with Redis adapter');
      this.redisInitialized = true;
    } catch (error) {
      logger.warn('⚠ Redis adapter not initialized, running in single-instance mode');
      logger.warn('For production with multiple instances, ensure Redis is available');
    }
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        socket.data.authenticated = false;
        return next(); // Allow connection but mark as unauthenticated
      }

      try {
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
        socket.data.authenticated = true;
        logger.debug(`WebSocket authenticated: ${payload.userId}`);
      } catch (error) {
        socket.data.authenticated = false;
      }

      next();
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user?.userId;
      logger.info(`WebSocket connected: ${socket.id}${userId ? ` (User: ${userId})` : ' (Anonymous)'}`);

      // Join user's private room if authenticated
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Subscribe to asset price updates
      socket.on('subscribe:price', async (data: { assetId: string }) => {
        try {
          const { assetId } = data;

          if (!assetId) {
            socket.emit('error', { message: 'Asset ID is required' });
            return;
          }

          socket.join(`price:${assetId}`);
          logger.debug(`Socket ${socket.id} subscribed to price updates for asset ${assetId}`);

          // Send current price immediately
          const currentPrice = await marketDataService.getCurrentPrice(assetId);
          if (currentPrice) {
            socket.emit('price:update', {
              assetId,
              price: currentPrice,
              timestamp: new Date(),
            });
          }

          socket.emit('subscribed', { assetId, channel: 'price' });
        } catch (error) {
          logger.error('Error subscribing to price:', error);
          socket.emit('error', { message: 'Failed to subscribe to price updates' });
        }
      });

      // Unsubscribe from asset price updates
      socket.on('unsubscribe:price', (data: { assetId: string }) => {
        const { assetId } = data;
        socket.leave(`price:${assetId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from price updates for asset ${assetId}`);
        socket.emit('unsubscribed', { assetId, channel: 'price' });
      });

      // Subscribe to all active assets
      socket.on('subscribe:all-prices', async () => {
        try {
          const assets = await marketDataService.getActiveAssets();

          for (const asset of assets) {
            socket.join(`price:${asset.id}`);
          }

          logger.debug(`Socket ${socket.id} subscribed to all price updates`);
          socket.emit('subscribed', { channel: 'all-prices', count: assets.length });
        } catch (error) {
          logger.error('Error subscribing to all prices:', error);
          socket.emit('error', { message: 'Failed to subscribe to price updates' });
        }
      });

      // Subscribe to trade updates (requires authentication)
      socket.on('subscribe:trades', () => {
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(`trades:${userId}`);
        logger.debug(`Socket ${socket.id} subscribed to trade updates`);
        socket.emit('subscribed', { channel: 'trades' });
      });

      // Subscribe to wallet updates (requires authentication)
      socket.on('subscribe:wallet', () => {
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(`wallet:${userId}`);
        logger.debug(`Socket ${socket.id} subscribed to wallet updates`);
        socket.emit('subscribed', { channel: 'wallet' });
      });

      // Ping/Pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`WebSocket error on ${socket.id}:`, error);
      });
    });

    // Listen to market data events
    this.setupMarketDataBroadcast();
  }

  private setupMarketDataBroadcast() {
    // Broadcast price updates to all subscribers
    marketDataService.on('price:update', (priceUpdate) => {
      this.io.to(`price:${priceUpdate.assetId}`).emit('price:update', priceUpdate);
    });

    logger.info('Market data broadcast setup complete');
  }

  // Public methods for broadcasting events

  public broadcastTradeUpdate(userId: string, trade: any) {
    this.io.to(`trades:${userId}`).to(`user:${userId}`).emit('trade:update', trade);
  }

  public broadcastWalletUpdate(userId: string, wallet: any) {
    this.io.to(`wallet:${userId}`).to(`user:${userId}`).emit('wallet:update', wallet);
  }

  public broadcastNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public broadcastSystemAnnouncement(message: string) {
    this.io.emit('system:announcement', { message, timestamp: new Date() });
  }

  public getConnectedUsers(): number {
    return this.io.sockets.sockets.size;
  }

  public getUserConnections(userId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`user:${userId}`);
    return room ? room.size : 0;
  }
}

export default WebSocketServer;
