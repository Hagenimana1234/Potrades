import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supportService } from '../services/support.service';
import { TicketStatus, TicketPriority, TicketCategory, UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/support/tickets
 * Get tickets (filtered by user for regular users, all for staff)
 */
router.get(
  '/tickets',
  validate([
    query('status').optional().isIn(Object.values(TicketStatus)),
    query('priority').optional().isIn(Object.values(TicketPriority)),
    query('category').optional().isIn(Object.values(TicketCategory)),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { status, priority, category, page = 1, limit = 20 } = req.query;

      const filters: any = {
        ...(status && { status: status as TicketStatus }),
        ...(priority && { priority: priority as TicketPriority }),
        ...(category && { category: category as TicketCategory }),
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
);

/**
 * GET /api/support/my-tickets
 * Get current user's tickets
 */
router.get('/my-tickets', async (req, res) => {
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
});

/**
 * GET /api/support/stats
 * Get ticket statistics
 */
router.get(
  '/stats',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([query('days').optional().isInt({ min: 1, max: 365 }).toInt()]),
  async (req, res) => {
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
);

/**
 * GET /api/support/tickets/:id
 * Get ticket details
 */
router.get(
  '/tickets/:id',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * GET /api/support/tickets/number/:ticketNumber
 * Get ticket by ticket number
 */
router.get(
  '/tickets/number/:ticketNumber',
  validate([param('ticketNumber').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets
 * Create a new ticket
 */
router.post(
  '/tickets',
  validate([
    body('category').isIn(Object.values(TicketCategory)),
    body('subject').isString().notEmpty().isLength({ min: 5, max: 200 }),
    body('description').isString().notEmpty().isLength({ min: 10, max: 5000 }),
    body('priority').optional().isIn(Object.values(TicketPriority)),
  ]),
  async (req, res) => {
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
);

/**
 * PUT /api/support/tickets/:id
 * Update ticket (staff only)
 */
router.put(
  '/tickets/:id',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([
    param('id').isString(),
    body('status').optional().isIn(Object.values(TicketStatus)),
    body('priority').optional().isIn(Object.values(TicketPriority)),
    body('assignedTo').optional().isString(),
    body('resolution').optional().isString(),
  ]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets/:id/assign
 * Assign ticket to agent (staff only)
 */
router.post(
  '/tickets/:id/assign',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([param('id').isString(), body('agentId').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets/:id/resolve
 * Resolve ticket (staff only)
 */
router.post(
  '/tickets/:id/resolve',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([param('id').isString(), body('resolution').isString().notEmpty()]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets/:id/close
 * Close ticket
 */
router.post(
  '/tickets/:id/close',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets/:id/reopen
 * Reopen ticket
 */
router.post(
  '/tickets/:id/reopen',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/support/tickets/:id/messages
 * Add message to ticket
 */
router.post(
  '/tickets/:id/messages',
  validate([param('id').isString(), body('message').isString().notEmpty(), body('attachments').optional().isArray()]),
  async (req, res) => {
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
);

/**
 * GET /api/support/tickets/:id/messages
 * Get ticket messages
 */
router.get(
  '/tickets/:id/messages',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

export default router;
