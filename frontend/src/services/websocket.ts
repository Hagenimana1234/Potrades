import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token?: string) {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Subscribe to price updates
  subscribeToPrices(assetId: string, callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe:price', { assetId });
    this.socket.on('price:update', callback);
  }

  subscribeToAllPrices(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe:all-prices');
    this.socket.on('price:update', callback);
  }

  unsubscribeFromPrices(assetId: string) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe:price', { assetId });
  }

  // Subscribe to trade updates
  subscribeToTrades(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe:trades');
    this.socket.on('trade:update', callback);
  }

  // Subscribe to wallet updates
  subscribeToWallet(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe:wallet');
    this.socket.on('wallet:update', callback);
  }

  // Subscribe to notifications
  onNotification(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('notification', callback);
  }

  // Ping/Pong
  ping() {
    if (!this.socket) return;
    this.socket.emit('ping');
  }

  onPong(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('pong', callback);
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();
export default wsService;
