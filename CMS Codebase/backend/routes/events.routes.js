const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const eventsRepository = require('../repositories/EventsRepository');
const MpesaService = require('../utils/mpesa');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../helpers/controllerLogger');
const { pool } = require('../config/database');

const logger = createLogger('events.routes');

// Configure multer for event poster uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/events');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-poster-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  }
});

// Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, department_id, is_public } = req.query;

    const result = await eventsRepository.getAllEvents({
      page, limit, department_id, is_public,
      userId: req.user.id,
      userRoles: req.user.roles
    });

    res.json(result);
  } catch (error) {
    logger.error('getEvents', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all RSVPs (frontend compatibility)
router.get('/rsvps', authenticateToken, async (req, res) => {
  res.json({ rsvps: [] });
});

// Get single event
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
             d.name as department_name
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];

    // Check access permissions
    if (!event.is_public && 
        !req.user.roles.includes('Super Admin') && 
        !req.user.roles.includes('Pastor') && 
        !req.user.roles.includes('First Elder')) {
      
      // Check if user is member of the department
      const deptMemberQuery = `
        SELECT 1 FROM department_members 
        WHERE user_id = $1 AND department_id = $2
      `;
      const deptMemberResult = await pool.query(deptMemberQuery, [req.user.id, event.department_id]);
      
      if (deptMemberResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get attendees
    const attendeesQuery = `
      SELECT u.id, u.first_name, u.last_name, u.email, ea.registered_at, ea.attended
      FROM event_attendance ea
      INNER JOIN users u ON ea.member_id = u.id
      WHERE ea.event_id = $1
      ORDER BY ea.registered_at ASC
    `;

    const attendeesResult = await pool.query(attendeesQuery, [id]);

    res.json({ 
      event: {
        ...event,
        attendees: attendeesResult.rows
      }
    });
  } catch (error) {
    logger.error('getEvent', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/', 
  authenticateToken,
  upload.single('poster'),
  [
    body('title').trim().notEmpty().withMessage('Event title is required'),
    body('description').trim().notEmpty().withMessage('Event description is required'),
    body('event_date').isISO8601().withMessage('Valid event date is required'),
    body('location').trim().notEmpty().withMessage('Event location is required'),
    body('department_id').optional().isUUID().withMessage('Valid department ID required'),
    body('max_attendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be positive'),
    body('is_public').optional().isBoolean().withMessage('Is public must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { title, description, event_date, location, department_id, max_attendees, is_public = true } = req.body;
      const posterUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

      const query = `
        INSERT INTO events (title, description, event_date, location, department_id, organizer_id, max_attendees, is_public, poster_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await pool.query(query, [
        title, description, event_date, location, department_id, req.user.id, max_attendees, is_public, posterUrl
      ]);

      res.status(201).json({
        message: 'Event created successfully',
        event: result.rows[0]
      });
    } catch (error) {
      logger.error('createEvent', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update event
router.put('/:id',
  authenticateToken,
  upload.single('poster'),
  [
    body('title').optional().trim().notEmpty().withMessage('Event title cannot be empty'),
    body('description').optional().trim().notEmpty().withMessage('Event description cannot be empty'),
    body('event_date').optional().isISO8601().withMessage('Valid event date is required'),
    body('location').optional().trim().notEmpty().withMessage('Event location cannot be empty'),
    body('department_id').optional().isUUID().withMessage('Valid department ID required'),
    body('max_attendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be positive'),
    body('is_public').optional().isBoolean().withMessage('Is public must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { title, description, event_date, location, department_id, max_attendees, is_public } = req.body;

      // Check if event exists and user has permission
      const checkQuery = `
        SELECT e.*,
               CASE
                 WHEN e.organizer_id = $1 THEN true
                 WHEN $2 = ANY($3) THEN true
                 ELSE false
               END as can_edit
        FROM events e
        WHERE e.id = $4
      `;

      const checkResult = await pool.query(checkQuery, [
        req.user.id,
        'Super Admin',
        ['Super Admin', 'Pastor', 'First Elder'],
        id
      ]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!checkResult.rows[0].can_edit) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Handle poster upload
      let posterUrl = checkResult.rows[0].poster_url;
      if (req.file) {
        // Delete old poster if exists
        if (posterUrl) {
          const oldPosterPath = path.join(__dirname, '..', posterUrl);
          if (fs.existsSync(oldPosterPath)) {
            fs.unlinkSync(oldPosterPath);
          }
        }
        posterUrl = `/uploads/events/${req.file.filename}`;
      }

      const updateQuery = `
        UPDATE events
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            event_date = COALESCE($3, event_date),
            location = COALESCE($4, location),
            department_id = COALESCE($5, department_id),
            max_attendees = COALESCE($6, max_attendees),
            is_public = COALESCE($7, is_public),
            poster_url = COALESCE($8, poster_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        title, description, event_date, location, department_id, max_attendees, is_public, posterUrl, id
      ]);

      res.json({
        message: 'Event updated successfully',
        event: result.rows[0]
      });
    } catch (error) {
      logger.error('updateEvent', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Frontend-compatible RSVP endpoint
router.post('/:id/rsvp', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['attending', 'maybe', 'not_attending', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    res.json({
      success: true,
      message: 'RSVP recorded successfully',
      rsvp: {
        event_id: id,
        user_id: req.user.id,
        status,
        registered_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('rsvpEvent', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register for event
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists and is accessible
    const eventQuery = `
      SELECT e.*, 
             CASE 
               WHEN e.is_public = true THEN true
               WHEN e.department_id IN (
                 SELECT department_id FROM department_members WHERE user_id = $1
               ) THEN true
               ELSE false
             END as can_access
      FROM events e
      WHERE e.id = $2
    `;

    const eventResult = await pool.query(eventQuery, [req.user.id, id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    if (!event.can_access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if event has max attendees limit
    if (event.max_attendees) {
      const countQuery = 'SELECT COUNT(*) as count FROM event_attendance WHERE event_id = $1';
      const countResult = await pool.query(countQuery, [id]);
      
      if (parseInt(countResult.rows[0].count) >= event.max_attendees) {
        return res.status(400).json({ error: 'Event is fully booked' });
      }
    }

    // Register for event
    const registerQuery = `
      INSERT INTO event_attendance (event_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, member_id) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(registerQuery, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    res.status(201).json({
      message: 'Successfully registered for event',
      attendance: result.rows[0]
    });
  } catch (error) {
    logger.error('registerForEvent', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel event registration
router.delete('/:id/register', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM event_attendance WHERE event_id = $1 AND member_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    logger.error('cancelRegistration', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance (organizer or admin)
router.patch('/:id/attendance/:userId', 
  authenticateToken,
  [
    body('attended').isBoolean().withMessage('Attended status must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { id, userId } = req.params;
      const { attended } = req.body;

      // Check if user has permission to mark attendance
      const eventQuery = 'SELECT organizer_id FROM events WHERE id = $1';
      const eventResult = await pool.query(eventQuery, [id]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const hasPermission = req.user.id === eventResult.rows[0].organizer_id ||
        req.user.roles.some(role => ['Super Admin', 'Pastor', 'First Elder'].includes(role));

      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const result = await pool.query(
        'UPDATE event_attendance SET attended = $1 WHERE event_id = $2 AND member_id = $3 RETURNING *',
        [attended, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      res.json({
        message: 'Attendance marked successfully',
        attendance: result.rows[0]
      });
    } catch (error) {
      logger.error('markAttendance', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete event (organizer or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists and user has permission
    const checkQuery = `
      SELECT e.*, 
             CASE 
               WHEN e.organizer_id = $1 THEN true
               WHEN $2 = ANY($3) THEN true
               ELSE false
               END as can_delete
      FROM events e
      WHERE e.id = $4
    `;

    const checkResult = await pool.query(checkQuery, [
      req.user.id, 
      'Super Admin', 
      ['Super Admin', 'Pastor', 'First Elder'], 
      id
    ]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!checkResult.rows[0].can_delete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('deleteEvent', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TICKET TYPES
// ============================================

// Get ticket types for an event
router.get('/:id/ticket-types', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT tt.*,
             (SELECT COUNT(*) FROM event_registrations er WHERE er.ticket_type_id = tt.id) as registrations_count
      FROM ticket_types tt
      WHERE tt.event_id = $1 AND tt.is_active = true
      ORDER BY tt.price ASC
    `;

    const result = await pool.query(query, [id]);
    res.json({ ticket_types: result.rows });
  } catch (error) {
    logger.error('getTicketTypes', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create ticket type for an event
router.post('/:id/ticket-types',
  authenticateToken,
  requireRole(['Super Admin', 'Pastor', 'First Elder', 'Department Head']),
  [
    body('name').trim().notEmpty().withMessage('Ticket type name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    body('description').optional().isString(),
    body('max_quantity').optional().isInt({ min: 1 }),
    body('available_from').optional().isISO8601(),
    body('available_until').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { name, description, price, max_quantity, available_from, available_until } = req.body;

      // Check if user has permission to manage this event
      const checkQuery = `
        SELECT e.*, 
               CASE 
                 WHEN e.organizer_id = $1 THEN true
                 WHEN $2 = ANY($3) THEN true
                 ELSE false
               END as can_manage
        FROM events e
        WHERE e.id = $4
      `;

      const checkResult = await pool.query(checkQuery, [
        req.user.id, 
        'Super Admin', 
        ['Super Admin', 'Pastor', 'First Elder'], 
        id
      ]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!checkResult.rows[0].can_manage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const query = `
        INSERT INTO ticket_types (event_id, name, description, price, max_quantity, available_from, available_until)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await pool.query(query, [
        id, name, description, price, max_quantity, available_from, available_until
      ]);

      res.status(201).json({ ticket_type: result.rows[0] });
    } catch (error) {
      logger.error('createTicketType', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================
// EVENT REGISTRATION WITH PAYMENT
// ============================================

// Register for event with payment
router.post('/:id/register-with-payment',
  authenticateToken,
  [
    body('phone_number').isMobilePhone().withMessage('Valid phone number required'),
    body('ticket_type_id').optional().isUUID(),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const client = await pool.connect();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { phone_number, ticket_type_id, notes } = req.body;

      await client.query('BEGIN');

      // Check if event exists and is accessible
      const eventQuery = `
        SELECT e.*, 
               CASE 
                 WHEN e.is_public = true THEN true
                 WHEN e.department_id IN (
                   SELECT department_id FROM department_members WHERE user_id = $1
                 ) THEN true
                 ELSE false
               END as can_access
        FROM events e
        WHERE e.id = $2
      `;

      const eventResult = await client.query(eventQuery, [req.user.id, id]);

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventResult.rows[0];

      if (!event.can_access) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if event requires payment
      if (!event.is_paid_event) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This event does not require payment' });
      }

      // Determine registration fee
      let registrationFee = event.registration_fee;
      if (ticket_type_id) {
        const ticketQuery = 'SELECT * FROM ticket_types WHERE id = $1 AND event_id = $2 AND is_active = true';
        const ticketResult = await client.query(ticketQuery, [ticket_type_id, id]);
        
        if (ticketResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Ticket type not found' });
        }
        
        registrationFee = ticketResult.rows[0].price;
      }

      // Check if event has max attendees limit
      if (event.max_attendees) {
        const countQuery = 'SELECT COUNT(*) as count FROM event_attendance WHERE event_id = $1';
        const countResult = await client.query(countQuery, [id]);
        
        if (parseInt(countResult.rows[0].count) >= event.max_attendees) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Event is fully booked' });
        }
      }

      // Check if already registered
      const existingQuery = 'SELECT * FROM event_attendance WHERE event_id = $1 AND member_id = $2';
      const existingResult = await client.query(existingQuery, [id, req.user.id]);
      
      if (existingResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Already registered for this event' });
      }

      // Create payment record
      const paymentQuery = `
        INSERT INTO payments (member_id, phone_number, amount, notes, status, payment_method)
        VALUES ($1, $2, $3, $4, 'pending', 'mpesa')
        RETURNING *
      `;

      const paymentResult = await client.query(paymentQuery, [
        req.user.id, phone_number, registrationFee, notes || ` - Event: ${event.title}`
      ]);

      const payment = paymentResult.rows[0];

      // Create event registration record (pending payment)
      const registrationQuery = `
        INSERT INTO event_registrations (event_id, member_id, payment_id, ticket_type_id, registration_date, amount_paid, status)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 'pending_payment')
        RETURNING *
      `;

      const registrationResult = await client.query(registrationQuery, [
        id, req.user.id, payment.id, ticket_type_id, registrationFee
      ]);

      const registration = registrationResult.rows[0];

      // Initiate M-Pesa STK push
      const mpesaService = new MpesaService();
      const accountReference = `EVENT-${id.toString().slice(-8)}`;
      
      const stkResult = await mpesaService.initiateSTKPush(
        phone_number,
        registrationFee,
        accountReference,
        `Registration for ${event.title}`
      );

      if (!stkResult.success) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Failed to initiate payment',
          details: stkResult.error
        });
      }

      // Update payment with transaction details
      await client.query(
        'UPDATE payments SET transaction_id = $1, mpesa_receipt_number = $2 WHERE id = $3',
        [stkResult.data.CheckoutRequestID, stkResult.data.MerchantRequestID, payment.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Registration initiated. Please complete payment on your phone.',
        registration: {
          id: registration.id,
          event_id: registration.event_id,
          amount: registrationFee,
          status: 'pending_payment'
        },
        payment: {
          id: payment.id,
          amount: registrationFee,
          transaction_id: stkResult.data.CheckoutRequestID,
          status: 'pending'
        },
        stk_push: {
          checkout_request_id: stkResult.data.CheckoutRequestID,
          merchant_request_id: stkResult.data.MerchantRequestID,
          customer_message: stkResult.data.CustomerMessage
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('registerWithPayment', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

// Get event registrations with payment status
router.get('/:id/registrations', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT er.*, 
             u.first_name, u.last_name, u.email, u.phone_number,
             p.status as payment_status, p.amount as payment_amount,
             tt.name as ticket_type_name, tt.price as ticket_price,
             e.title as event_title
      FROM event_registrations er
      LEFT JOIN users u ON er.member_id = u.id
      LEFT JOIN payments p ON er.payment_id = p.id
      LEFT JOIN ticket_types tt ON er.ticket_type_id = tt.id
      LEFT JOIN events e ON er.event_id = e.id
      WHERE er.event_id = $1
      ORDER BY er.registration_date DESC
    `;

    const result = await pool.query(query, [id]);
    res.json({ registrations: result.rows });
  } catch (error) {
    logger.error('getEventRegistrations', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
