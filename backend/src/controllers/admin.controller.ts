import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/database';
import tradingService from '../services/trading.service';
import walletService from '../services/wallet.service';
import marketDataService from '../services/marketData.service';
import copyTradingService from '../services/copyTrading.service';
import affiliateService from '../services/affiliate.service';
import { priceOrchestrationService } from '../services/priceOrchestration.service';

export class AdminController {
  // User Management
  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, limit = 50, offset = 0 } = req.query;
      const where: any = {};

      if (status) where.status = status;
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            role: true,
            kycStatus: true,
            createdAt: true,
            lastLoginAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ success: true, data: { users, total } });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { status },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'USER_' + status,
          entity: 'User',
          entityId: userId,
          details: { status, reason },
        },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async adjustBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, walletType, amount, reason } = req.body;
      const adminId = req.user!.userId;

      await walletService.adminAdjustBalance(userId, walletType, amount, reason, adminId);

      res.json({ success: true, message: 'Balance adjusted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Trading Management
  async getAllTrades(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        userId: req.query.userId as string,
        assetId: req.query.assetId as string,
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      const result = await tradingService.adminGetTrades(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPlatformExposure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const exposure = await tradingService.calculatePlatformExposure();
      res.json({ success: true, data: exposure });
    } catch (error) {
      next(error);
    }
  }

  async getPlatformStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [totalUsers, activeUsers, totalTrades, totalVolume, openTrades] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.trade.count({ where: { status: { in: ['WON', 'LOST'] } } }),
        prisma.trade.aggregate({
          where: { status: { in: ['WON', 'LOST'] } },
          _sum: { amount: true },
        }),
        prisma.trade.count({ where: { status: 'OPEN' } }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalTrades,
          totalVolume: totalVolume._sum.amount?.toNumber() || 0,
          openTrades,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Asset Management
  async updateAsset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const updateData = req.body;

      const asset = await prisma.asset.update({
        where: { id: assetId },
        data: updateData,
      });

      res.json({ success: true, data: asset });
    } catch (error) {
      next(error);
    }
  }

  async createAsset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const asset = await marketDataService.adminUpsertAsset(req.body);
      res.json({ success: true, data: asset });
    } catch (error) {
      next(error);
    }
  }

  // Copy Trading Management
  async getPendingCopyTraders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pending = await prisma.copyTrader.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });

      res.json({ success: true, data: pending });
    } catch (error) {
      next(error);
    }
  }

  async approveCopyTrader(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { copyTraderId } = req.params;
      const adminId = req.user!.userId;

      const result = await copyTradingService.approveCopyTrader(copyTraderId, adminId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async suspendCopyTrader(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { copyTraderId } = req.params;
      const adminId = req.user!.userId;

      const result = await copyTradingService.suspendCopyTrader(copyTraderId, adminId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // Affiliate Management
  async getAllAffiliates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as any,
        minTotalCommission: req.query.minTotalCommission ? Number(req.query.minTotalCommission) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      const result = await affiliateService.adminGetAffiliates(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async approveAffiliate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { affiliateId } = req.params;
      const adminId = req.user!.userId;
      const settings = req.body;

      const result = await affiliateService.approveAffiliate(affiliateId, adminId, settings);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPendingCommissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const commissions = await affiliateService.adminGetPendingCommissions();
      res.json({ success: true, data: commissions });
    } catch (error) {
      next(error);
    }
  }

  async approveCommission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { commissionId } = req.params;
      const adminId = req.user!.userId;

      const result = await affiliateService.approveCommission(commissionId, adminId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async payCommission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { commissionId } = req.params;
      const { paymentMethod, paymentRef } = req.body;
      const adminId = req.user!.userId;

      const result = await affiliateService.payCommission(
        commissionId,
        adminId,
        paymentMethod,
        paymentRef
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // System Settings
  async getSystemSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.systemSetting.findMany({
        orderBy: { category: 'asc' },
      });

      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSystemSetting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      res.json({ success: true, data: setting });
    } catch (error) {
      next(error);
    }
  }

  // Audit Logs
  async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, action, limit = 100, offset = 0 } = req.query;
      const where: any = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { email: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({ success: true, data: { logs, total } });
    } catch (error) {
      next(error);
    }
  }

  // ==================== OTC PRICING CONFIGURATION (POL MANAGEMENT) ====================

  /**
   * Get all OTC pricing configurations
   * Critical for monitoring and managing the Price Orchestration Layer
   */
  async getOTCPricingConfigs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const configs = await priceOrchestrationService.getAllPricingConfigs();
      res.json({ success: true, data: configs });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get OTC pricing config for specific asset
   */
  async getOTCPricingConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;

      const config = await prisma.oTCPricingConfig.findUnique({
        where: { assetId },
        include: {
          asset: {
            select: {
              symbol: true,
              name: true,
              type: true,
            },
          },
        },
      });

      if (!config) {
        return res.status(404).json({ success: false, message: 'Pricing config not found' });
      }

      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update OTC pricing config for asset
   * CRITICAL: This controls spread, slippage, price adjustment for POL
   */
  async updateOTCPricingConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const { spreadPercent, slippagePercent, priceAdjustment, executionDelayMs, maxExposure } = req.body;
      const adminId = req.user!.userId;

      const config = await priceOrchestrationService.updatePricingConfig(assetId, {
        spreadPercent,
        slippagePercent,
        priceAdjustment,
        executionDelayMs,
        maxExposure,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'OTC_CONFIG_UPDATE',
          entity: 'OTCPricingConfig',
          entityId: config.id,
          details: {
            assetId,
            spreadPercent,
            slippagePercent,
            priceAdjustment,
            executionDelayMs,
            maxExposure,
          },
        },
      });

      res.json({ success: true, data: config, message: 'Pricing config updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform exposure for risk monitoring
   */
  async getPlatformExposure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.query;

      if (assetId) {
        // Get exposure for specific asset
        const exposure = await priceOrchestrationService.calculatePlatformExposure(assetId as string);

        const asset = await prisma.asset.findUnique({
          where: { id: assetId as string },
          select: { symbol: true, name: true },
        });

        res.json({
          success: true,
          data: {
            assetId,
            symbol: asset?.symbol,
            name: asset?.name,
            exposure,
            direction: exposure > 0 ? 'LONG' : exposure < 0 ? 'SHORT' : 'NEUTRAL',
          },
        });
      } else {
        // Get exposure for all active assets
        const assets = await prisma.asset.findMany({
          where: { isActive: true },
          select: { id: true, symbol: true, name: true },
        });

        const exposures = await Promise.all(
          assets.map(async (asset) => {
            const exposure = await priceOrchestrationService.calculatePlatformExposure(asset.id);
            return {
              assetId: asset.id,
              symbol: asset.symbol,
              name: asset.name,
              exposure,
              direction: exposure > 0 ? 'LONG' : exposure < 0 ? 'SHORT' : 'NEUTRAL',
            };
          })
        );

        // Calculate total exposure
        const totalExposure = exposures.reduce((sum, e) => sum + e.exposure, 0);

        res.json({
          success: true,
          data: {
            totalExposure,
            assets: exposures.sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure)),
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear POL cache (force refresh of pricing configs)
   */
  async clearPOLCache(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      priceOrchestrationService.clearCache();

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'POL_CACHE_CLEAR',
          entity: 'System',
          entityId: 'pol-cache',
          details: { timestamp: new Date() },
        },
      });

      res.json({ success: true, message: 'POL cache cleared successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get synthetic price preview (test POL without saving)
   */
  async previewSyntheticPrice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { assetId, seedPrice } = req.body;

      if (!assetId || !seedPrice) {
        return res.status(400).json({ success: false, message: 'assetId and seedPrice are required' });
      }

      const platformExposure = await priceOrchestrationService.calculatePlatformExposure(assetId);

      const syntheticPrice = await priceOrchestrationService.generateSyntheticPrice({
        assetId,
        seedPrice: Number(seedPrice),
        timestamp: new Date(),
        platformExposure,
      });

      const config = await prisma.oTCPricingConfig.findUnique({
        where: { assetId },
      });

      res.json({
        success: true,
        data: {
          seedPrice: Number(seedPrice),
          syntheticPrice,
          difference: syntheticPrice - Number(seedPrice),
          differencePercent: ((syntheticPrice - Number(seedPrice)) / Number(seedPrice)) * 100,
          platformExposure,
          config: {
            spreadPercent: config?.spreadPercent.toNumber(),
            slippagePercent: config?.slippagePercent.toNumber(),
            priceAdjustment: config?.priceAdjustment.toNumber(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
