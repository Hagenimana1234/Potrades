import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import supportController from '../controllers/support.controller';
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
  supportController.getTickets
);

/**
 * GET /api/support/my-tickets
 * Get current user's tickets
 */
router.get('/my-tickets', supportController.getUserTickets);

/**
 * GET /api/support/stats
 * Get ticket statistics
 */
router.get(
  '/stats',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([query('days').optional().isInt({ min: 1, max: 365 }).toInt()]),
  supportController.getTicketStats
);

/**
 * GET /api/support/tickets/:id
 * Get ticket details
 */
router.get(
  '/tickets/:id',
  validate([param('id').isString()]),
  supportController.getTicketById
);

/**
 * GET /api/support/tickets/number/:ticketNumber
 * Get ticket by ticket number
 */
router.get(
  '/tickets/number/:ticketNumber',
  validate([param('ticketNumber').isString()]),
  supportController.getTicketByNumber
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
  supportController.createTicket
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
  supportController.updateTicket
);

/**
 * POST /api/support/tickets/:id/assign
 * Assign ticket to agent (staff only)
 */
router.post(
  '/tickets/:id/assign',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([param('id').isString(), body('agentId').isString()]),
  supportController.assignTicket
);

/**
 * POST /api/support/tickets/:id/resolve
 * Resolve ticket (staff only)
 */
router.post(
  '/tickets/:id/resolve',
  authorize([UserRole.ADMIN, UserRole.SUPPORT]),
  validate([param('id').isString(), body('resolution').isString().notEmpty()]),
  supportController.resolveTicket
);

/**
 * POST /api/support/tickets/:id/close
 * Close ticket
 */
router.post(
  '/tickets/:id/close',
  validate([param('id').isString()]),
  supportController.closeTicket
);

/**
 * POST /api/support/tickets/:id/reopen
 * Reopen ticket
 */
router.post(
  '/tickets/:id/reopen',
  validate([param('id').isString()]),
  supportController.reopenTicket
);

/**
 * POST /api/support/tickets/:id/messages
 * Add message to ticket
 */
router.post(
  '/tickets/:id/messages',
  validate([param('id').isString(), body('message').isString().notEmpty(), body('attachments').optional().isArray()]),
  supportController.addMessage
);

/**
 * GET /api/support/tickets/:id/messages
 * Get ticket messages
 */
router.get(
  '/tickets/:id/messages',
  validate([param('id').isString()]),
  supportController.getTicketMessages
);

export default router;
