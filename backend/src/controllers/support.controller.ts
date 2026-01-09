import { Request, Response, NextFunction } from 'express';
import { supportService } from '../services/support.service';
import { TicketStatus, TicketPriority, UserRole } from '@prisma/client';

class SupportController {
  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, priority, category, page = 1, limit = 20 } = req.query;

      const filters: any = {
        ...(status && { status: status as TicketStatus }),
        ...(priority && { priority: priority as TicketPriority }),
        ...(category && { category }),
      };

      // Regular users can only see their own tickets
      if (userRole === UserRole.USER) {
        filters.userId = userId;
      }

      const result = await supportService.getTickets(filters, Number(page), Number(limit));

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

  async getUserTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;

      const tickets = await supportService.getUserTickets(userId, status as TicketStatus | undefined);

      res.json({
        success: true,
        data: tickets,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getTicketStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { days = 30 } = req.query;

      const stats = await supportService.getTicketStats(Number(days));

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

  async getTicketById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Staff can see all tickets, users only their own
      const ticket = await supportService.getTicketById(
        id,
        userRole === UserRole.USER ? userId : undefined
      );

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') || error.message.includes('Access denied') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getTicketByNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketNumber } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const ticket = await supportService.getTicketByNumber(
        ticketNumber,
        userRole === UserRole.USER ? userId : undefined
      );

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') || error.message.includes('Access denied') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { category, subject, description, priority } = req.body;

      const ticket = await supportService.createTicket({
        userId,
        category,
        subject,
        description,
        priority: priority || TicketPriority.NORMAL,
      });

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Support ticket created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { status, priority, assignedTo, resolution } = req.body;

      const ticket = await supportService.updateTicket(
        id,
        {
          status,
          priority,
          assignedTo,
          resolution,
        },
        userId
      );

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket updated successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async assignTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      const ticket = await supportService.assignTicket(id, agentId);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket assigned successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async resolveTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      const userId = req.user!.userId;

      const ticket = await supportService.resolveTicket(id, resolution, userId);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket resolved successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async closeTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const ticket = await supportService.closeTicket(id, userId);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket closed successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async reopenTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const ticket = await supportService.reopenTicket(id);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket reopened successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { message, attachments } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const isStaff = [UserRole.ADMIN, UserRole.SUPPORT].includes(userRole);

      const ticketMessage = await supportService.addMessage({
        ticketId: id,
        userId,
        message,
        isStaff,
        attachments,
      });

      res.status(201).json({
        success: true,
        data: ticketMessage,
        message: 'Message added successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getTicketMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const messages = await supportService.getTicketMessages(id);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new SupportController();
