import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import tradingService from '../services/trading.service';
import marketDataService from '../services/marketData.service';
import copyTradingService from '../services/copyTrading.service';
import { validateData, placeTradeSchema } from '../utils/validators';

export class TradingController {
  async placeTrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const tradeData = validateData(placeTradeSchema, req.body);

      const trade = await tradingService.placeTrade({
        userId,
        ...tradeData,
      });

      // Trigger copy trades if user is a copy trader
      if (!tradeData.walletType || tradeData.walletType === 'REAL') {
        await copyTradingService.executeCopyTrades(trade.id, trade);
      }

      res.status(201).json({
        success: true,
        data: trade,
        message: 'Trade placed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrades(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { walletType, status, limit, offset } = req.query;

      const result = await tradingService.getUserTrades(
        userId,
        walletType as any,
        status as any,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTradeStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { walletType } = req.query;

      const stats = await tradingService.getUserTradeStats(userId, walletType as any);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOpenTrades(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const trades = await tradingService.getOpenTrades(userId);

      res.json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelTrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { tradeId } = req.params;

      await tradingService.cancelTrade(tradeId, userId);

      res.json({
        success: true,
        message: 'Trade cancelled',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const assets = await marketDataService.getActiveAssets();

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentPrice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const price = await marketDataService.getCurrentPrice(assetId);

      res.json({
        success: true,
        data: { price },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPriceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const { interval, limit } = req.query;

      const candles = await marketDataService.getPriceHistory(
        assetId,
        interval as string,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: candles,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TradingController();
