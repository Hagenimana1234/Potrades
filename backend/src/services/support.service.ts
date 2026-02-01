import prisma from '../utils/database';
import { TicketStatus, TicketPriority, TicketCategory, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Support Service
 * Manages customer support tickets, messages, and assignments
 * Supports ticket lifecycle from creation to resolution
 */

interface CreateTicketInput {
  userId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
}

interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  resolution?: string;
}

interface AddMessageInput {
  ticketId: string;
  userId: string;
  message: string;
  isStaff: boolean;
  attachments?: string[];
}

interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  userId?: string;
}

class SupportService {
  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const count = await prisma.supportTicket.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `TKT-${number}`;
  }

  /**
   * Create a new support ticket
   */
  async createTicket(input: CreateTicketInput) {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: input.userId,
        ticketNumber,
        category: input.category,
        subject: input.subject,
        description: input.description,
        priority: input.priority || TicketPriority.NORMAL,
        status: TicketStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Support ticket created: ${ticket.ticketNumber} | User: ${input.userId} | Category: ${input.category}`);

    // Notify support team of new ticket
    this.notifySupportTeam(ticket);

    // Send confirmation email to user
    this.sendTicketCreatedEmail(ticket);

    return ticket;
  }

  /**
   * Get tickets with filtering and pagination
   */
  async getTickets(filters: TicketFilters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.category && { category: filters.category }),
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string, status?: TicketStatus) {
    const where: Prisma.SupportTicketWhereInput = {
      userId,
      ...(status && { status }),
    };

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets;
  }

  /**
   * Get ticket by ID with full details
   */
  async getTicketById(ticketId: string, userId?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // If userId provided, verify ownership (unless staff)
    if (userId && ticket.userId !== userId) {
      throw new ValidationError('Access denied to this ticket');
    }

    return ticket;
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string, userId?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // If userId provided, verify ownership (unless staff)
    if (userId && ticket.userId !== userId) {
      throw new ValidationError('Access denied to this ticket');
    }

    return ticket;
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, input: UpdateTicketInput, updatedBy?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const data: any = {
      ...(input.status && { status: input.status }),
      ...(input.priority && { priority: input.priority }),
      ...(input.assignedTo !== undefined && {
        assignedTo: input.assignedTo,
        assignedAt: input.assignedTo ? new Date() : null,
      }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
    };

    // If resolving or closing, set resolved metadata
    if (input.status === TicketStatus.RESOLVED || input.status === TicketStatus.CLOSED) {
      data.resolvedAt = new Date();
      data.resolvedBy = updatedBy;
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Ticket updated: ${ticket.ticketNumber} | Status: ${updated.status}`);

    return updated;
  }

  /**
   * Assign ticket to support agent
   */
  async assignTicket(ticketId: string, agentId: string) {
    return this.updateTicket(ticketId, { assignedTo: agentId });
  }

  /**
   * Resolve ticket
   */
  async resolveTicket(ticketId: string, resolution: string, resolvedBy: string) {
    return this.updateTicket(
      ticketId,
      {
        status: TicketStatus.RESOLVED,
        resolution,
      },
      resolvedBy
    );
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string, closedBy?: string) {
    return this.updateTicket(
      ticketId,
      {
        status: TicketStatus.CLOSED,
      },
      closedBy
    );
  }

  /**
   * Reopen ticket
   */
  async reopenTicket(ticketId: string) {
    return this.updateTicket(ticketId, {
      status: TicketStatus.OPEN,
    });
  }

  /**
   * Add message to ticket
   */
  async addMessage(input: AddMessageInput) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: input.ticketId,
        userId: input.userId,
        message: input.message,
        isStaff: input.isStaff,
        attachments: input.attachments || [],
      },
    });

    // Update ticket status based on who replied
    let newStatus = ticket.status;
    if (input.isStaff && ticket.status === TicketStatus.OPEN) {
      newStatus = TicketStatus.ANSWERED;
    } else if (!input.isStaff && ticket.status === TicketStatus.ANSWERED) {
      newStatus = TicketStatus.WAITING_REPLY;
    }

    if (newStatus !== ticket.status) {
      await prisma.supportTicket.update({
        where: { id: input.ticketId },
        data: { status: newStatus },
      });
    }

    logger.info(`Message added to ticket ${ticket.ticketNumber} | By: ${input.isStaff ? 'Staff' : 'User'}`);

    // Send notification to user/staff
    this.sendMessageNotification(ticket, message, input.isStaff);

    return message;
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string) {
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  /**
   * Add attachment to ticket
   */
  async addAttachment(ticketId: string, userId: string, filename: string, url: string, fileSize?: number, mimeType?: string) {
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId,
        userId,
        filename,
        url,
        fileSize,
        mimeType,
      },
    });

    return attachment;
  }

  /**
   * Get ticket statistics for dashboard
   */
  async getTicketStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, open, answered, resolved, closed, byCategory, byPriority] = await Promise.all([
      prisma.supportTicket.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.supportTicket.count({
        where: {
          status: TicketStatus.OPEN,
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: TicketStatus.ANSWERED,
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { gte: since },
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: TicketStatus.CLOSED,
          createdAt: { gte: since },
        },
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        where: {
          status: {
            in: [TicketStatus.OPEN, TicketStatus.WAITING_REPLY],
          },
        },
        _count: true,
      }),
    ]);

    const categoryBreakdown: Record<string, number> = {};
    byCategory.forEach((item) => {
      categoryBreakdown[item.category] = item._count;
    });

    const priorityBreakdown: Record<string, number> = {};
    byPriority.forEach((item) => {
      priorityBreakdown[item.priority] = item._count;
    });

    // Calculate average resolution time
    const resolvedTickets = await prisma.supportTicket.findMany({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: { gte: since },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    const avgResolutionTime =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, ticket) => {
            const duration = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
            return sum + duration;
          }, 0) / resolvedTickets.length
        : 0;

    const avgResolutionHours = avgResolutionTime / (1000 * 60 * 60);

    return {
      period: `${days} days`,
      total,
      open,
      answered,
      resolved,
      closed,
      avgResolutionHours: parseFloat(avgResolutionHours.toFixed(2)),
      byCategory: categoryBreakdown,
      byPriority: priorityBreakdown,
    };
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [assigned, resolved, avgResolutionTime] = await Promise.all([
      prisma.supportTicket.count({
        where: {
          assignedTo: agentId,
          createdAt: { gte: since },
        },
      }),
      prisma.supportTicket.count({
        where: {
          resolvedBy: agentId,
          resolvedAt: { gte: since },
        },
      }),
      prisma.supportTicket.findMany({
        where: {
          resolvedBy: agentId,
          resolvedAt: { gte: since },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    const avgTime =
      avgResolutionTime.length > 0
        ? avgResolutionTime.reduce((sum, ticket) => {
            const duration = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
            return sum + duration;
          }, 0) / avgResolutionTime.length
        : 0;

    const avgHours = avgTime / (1000 * 60 * 60);

    return {
      period: `${days} days`,
      assigned,
      resolved,
      avgResolutionHours: parseFloat(avgHours.toFixed(2)),
    };
  }

  /**
   * Auto-close old resolved tickets (for cron job)
   */
  async autoCloseResolvedTickets(daysResolved = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysResolved);

    const result = await prisma.supportTicket.updateMany({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: TicketStatus.CLOSED,
      },
    });

    logger.info(`Auto-closed ${result.count} resolved tickets older than ${daysResolved} days`);

    return result.count;
  }

  // ==================== EMAIL NOTIFICATION HELPERS ====================

  /**
   * Notify support team of new ticket
   */
  private notifySupportTeam(ticket: any) {
    try {
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastToAdmins('support:new-ticket', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          priority: ticket.priority,
          subject: ticket.subject,
          user: ticket.user,
        });
        logger.debug(`Notified support team of new ticket: ${ticket.ticketNumber}`);
      }
    } catch (error) {
      logger.error('Error notifying support team:', error);
    }
  }

  /**
   * Send ticket created email to user
   */
  private async sendTicketCreatedEmail(ticket: any) {
    try {
      if (!process.env.EMAIL_ENABLED) {
        return; // Email not configured, skip silently
      }

      // TODO: Implement email sending using your preferred service (SendGrid, AWS SES, etc.)
      // Example:
      // await emailService.send({
      //   to: ticket.user.email,
      //   subject: `Support Ticket Created: ${ticket.ticketNumber}`,
      //   template: 'ticket-created',
      //   data: {
      //     name: ticket.user.firstName || ticket.user.email,
      //     ticketNumber: ticket.ticketNumber,
      //     subject: ticket.subject,
      //     category: ticket.category,
      //   },
      // });

      logger.debug(`Ticket created email would be sent to ${ticket.user.email} (email service not configured)`);
    } catch (error) {
      logger.error('Error sending ticket created email:', error);
    }
  }

  /**
   * Send message notification
   */
  private async sendMessageNotification(ticket: any, message: any, isStaff: boolean) {
    try {
      const wsServer = (global as any).wsServer;

      if (isStaff) {
        // Notify user of staff reply
        if (wsServer) {
          wsServer.broadcastNotification(ticket.userId, {
            type: 'SUPPORT_REPLY',
            title: 'Support Team Replied',
            message: `Your ticket ${ticket.ticketNumber} has a new reply`,
            data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
          });
        }

        // Send email to user
        this.sendStaffReplyEmail(ticket);
      } else {
        // Notify support team of user reply
        if (wsServer) {
          wsServer.broadcastToAdmins('support:user-reply', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            message: message.message,
          });
        }

        // Send email to assigned agent
        if (ticket.assignedTo) {
          this.sendUserReplyEmail(ticket);
        }
      }
    } catch (error) {
      logger.error('Error sending message notification:', error);
    }
  }

  /**
   * Send staff reply email to user
   */
  private async sendStaffReplyEmail(ticket: any) {
    try {
      if (!process.env.EMAIL_ENABLED) {
        return;
      }

      // TODO: Implement email sending
      // await emailService.send({
      //   to: ticket.user.email,
      //   subject: `Support Reply: ${ticket.ticketNumber}`,
      //   template: 'staff-reply',
      //   data: {
      //     name: ticket.user.firstName || ticket.user.email,
      //     ticketNumber: ticket.ticketNumber,
      //     subject: ticket.subject,
      //   },
      // });

      logger.debug(`Staff reply email would be sent (email service not configured)`);
    } catch (error) {
      logger.error('Error sending staff reply email:', error);
    }
  }

  /**
   * Send user reply email to assigned agent
   */
  private async sendUserReplyEmail(ticket: any) {
    try {
      if (!process.env.EMAIL_ENABLED) {
        return;
      }

      // TODO: Implement email sending to agent
      logger.debug(`User reply email would be sent to agent (email service not configured)`);
    } catch (error) {
      logger.error('Error sending user reply email:', error);
    }
  }
}

export const supportService = new SupportService();
