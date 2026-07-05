const BaseController = require('./BaseController');
const EventsRepository = require('../repositories/EventsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Events Controller
 * Handles church events management including creation, updates, and attendee management
 */
class EventsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('EventsController');
  }

  /**
   * Get all events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllEvents(req, res) {
    try {
      const churchId = req.user.church_id;
      const events = await EventsRepository.findAll({}, churchId);
      
      res.json({ success: true, events });
      this.logger.info('getAllEvents', { count: events.length });
    } catch (error) {
      this.logger.error('getAllEvents', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get event by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Event ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const event = await EventsRepository.getWithCreatorDetails(id, churchId);

      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, event });
      this.logger.info('getEventById', { eventId: id });
    } catch (error) {
      this.logger.error('getEventById', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Create a new event
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Event title
   * @param {string} req.body.description - Event description
   * @param {string} req.body.event_date - Event date
   * @param {string} req.body.event_time - Event time
   * @param {string} req.body.location - Event location
   * @param {number} [req.body.max_attendees] - Maximum attendees
   * @param {boolean} [req.body.is_public] - Public event flag
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createEvent(req, res) {
    try {
      const { title, description, event_date, event_time, location, max_attendees, is_public } = req.body;
      const churchId = req.user.church_id;

      const event = await EventsRepository.createEvent({
        title, description, event_date, event_time, location, max_attendees, is_public,
        created_by: req.user.id
      }, churchId);

      res.status(201).json({ success: true, event });
      this.logger.info('createEvent', { eventId: event.id });
    } catch (error) {
      this.logger.error('createEvent', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Update an existing event
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Event ID
   * @param {Object} req.body - Request body with event fields to update
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const { title, description, event_date, event_time, location, max_attendees, is_public } = req.body;
      const churchId = req.user.church_id;

      const event = await EventsRepository.updateEvent(id, {
        title, description, event_date, event_time, location, max_attendees, is_public
      }, churchId);

      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, event });
    } catch (error) {
      this.logger.error('updateEvent', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Delete an event
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Event ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const deleted = await EventsRepository.delete(id, churchId);

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.json({ success: true, message: 'Event deleted successfully' });
      this.logger.info('deleteEvent', { eventId: id });
    } catch (error) {
      this.logger.error('deleteEvent', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new EventsController();
