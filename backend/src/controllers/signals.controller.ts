import { Request, Response, NextFunction } from 'express';
import { signalsService } from '../services/signals.service';
import { SignalType, SignalStatus } from '@prisma/client';

class SignalsController {
  async getSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, type, status, timeframe, tags, page = 1, limit = 20 } = req.query;

      const filters = {
        ...(assetId && { assetId: assetId as string }),
        ...(type && { type: type as SignalType }),
        ...(status && { status: status as SignalStatus }),
        ...(timeframe && { timeframe: timeframe as string }),
        ...(tags && { tags: Array.isArray(tags) ? (tags as string[]) : [tags as string] }),
      };

      const result = await signalsService.getSignals(filters, Number(page), Number(limit));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getActiveSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, limit = 20 } = req.query;

      const signals = await signalsService.getActiveSignals(assetId as string | undefined, Number(limit));

      res.json({
        success: true,
        data: signals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProviderSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;

      const signals = await signalsService.getProviderSignals(
        userId,
        status ? (status as SignalStatus) : undefined
      );

      res.json({
        success: true,
        data: signals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getUserSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const subscriptions = await signalsService.getUserSubscriptions(userId);

      res.json({
        success: true,
        data: subscriptions,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getGlobalStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { days = 30 } = req.query;

      const stats = await signalsService.getGlobalStats(Number(days));

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProviderPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      const performance = await signalsService.getProviderPerformance(userId, Number(days));

      res.json({
        success: true,
        data: performance,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getSignalById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const signal = await signalsService.getSignalById(id);

      res.json({
        success: true,
        data: signal,
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const {
        assetId,
        type,
        entryPrice,
        targetPrice,
        stopLoss,
        title,
        description,
        timeframe,
        tags,
        expiresAt,
      } = req.body;

      const signal = await signalsService.createSignal(userId, {
        assetId,
        type,
        entryPrice: parseFloat(entryPrice),
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        title,
        description,
        timeframe,
        tags,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        data: signal,
        message: 'Signal created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { type, status, targetPrice, stopLoss, title, description, timeframe, tags, expiresAt, exitPrice } =
        req.body;

      const signal = await signalsService.updateSignal(userId, id, {
        ...(type && { type }),
        ...(status && { status }),
        ...(targetPrice !== undefined && { targetPrice: parseFloat(targetPrice) }),
        ...(stopLoss !== undefined && { stopLoss: parseFloat(stopLoss) }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(timeframe !== undefined && { timeframe }),
        ...(tags && { tags }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : undefined }),
        ...(exitPrice !== undefined && { exitPrice: parseFloat(exitPrice) }),
      });

      res.json({
        success: true,
        data: signal,
        message: 'Signal updated successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async closeSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { exitPrice } = req.body;

      const signal = await signalsService.closeSignal(id, userId, parseFloat(exitPrice));

      res.json({
        success: true,
        data: signal,
        message: 'Signal closed successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await signalsService.deleteSignal(id, userId);

      res.json({
        success: true,
        message: 'Signal deleted successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async subscribeToSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { autoCopy = false, copyAmount } = req.body;

      const subscription = await signalsService.subscribeToSignal(
        userId,
        id,
        autoCopy,
        copyAmount ? parseFloat(copyAmount) : undefined
      );

      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Subscribed to signal successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async unsubscribeFromSignal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await signalsService.unsubscribeFromSignal(userId, id);

      res.json({
        success: true,
        message: 'Unsubscribed from signal successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { autoCopy, copyAmount } = req.body;

      const subscription = await signalsService.updateSubscription(
        userId,
        id,
        autoCopy,
        copyAmount ? parseFloat(copyAmount) : undefined
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Subscription updated successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new SignalsController();
