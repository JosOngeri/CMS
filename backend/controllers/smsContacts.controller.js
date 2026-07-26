const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * SMS Contacts Controller
 * Handles contact management for SMS platform
 */
class SMSContactsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SMSContactsController');
    this.db = require('../config/database');
  }

  /**
   * Get all contacts with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.source] - Filter by source
   * @param {string} [req.query.search] - Search term
   * @param {string} [req.query.group_id] - Filter by group
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContacts(req, res) {
    try {
      const { source, search, group_id } = req.query;
      const churchId = req.user.church_id;

      let query = `
        SELECT c.*, g.name as group_name 
        FROM sms_contacts c
        LEFT JOIN sms_groups g ON c.group_id = g.id
        WHERE c.church_id = $1
      `;
      const params = [churchId];
      let paramCount = 1;

      if (source && source !== 'all') {
        paramCount++;
        query += ` AND c.source = $${paramCount}`;
        params.push(source);
      }

      if (group_id) {
        paramCount++;
        query += ` AND c.group_id = $${paramCount}`;
        params.push(group_id);
      }

      if (search) {
        paramCount++;
        query += ` AND (c.name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY c.created_at DESC';

      const result = await this.db.query(query, params);
      this.success(res, { contacts: result.rows });
    } catch (error) {
      this.logger.error('getContacts', error);
      this.error(res, 'Failed to fetch contacts');
    }
  }

  /**
   * Get a single contact by ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Contact ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getContact(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const query = `
        SELECT c.*, g.name as group_name 
        FROM sms_contacts c
        LEFT JOIN sms_groups g ON c.group_id = g.id
        WHERE c.id = $1 AND c.church_id = $2
      `;
      const result = await this.db.query(query, [id, churchId]);

      if (result.rows.length === 0) {
        return this.error(res, 'Contact not found', 404);
      }

      this.success(res, { contact: result.rows[0] });
    } catch (error) {
      this.logger.error('getContact', error);
      this.error(res, 'Failed to fetch contact');
    }
  }

  /**
   * Create a new contact
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Contact name
   * @param {string} req.body.phone - Phone number
   * @param {string} [req.body.email] - Email address
   * @param {string} [req.body.group_id] - Group ID
   * @param {string} [req.body.source] - Source
   * @param {string} [req.body.status] - Status
   * @param {Object} [req.body.metadata] - Additional metadata
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createContact(req, res) {
    try {
      const { name, phone, email, group_id, source, status, metadata } = req.body;
      const churchId = req.user.church_id;

      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        return this.error(res, 'Invalid phone number format');
      }

      const query = `
        INSERT INTO sms_contacts (church_id, name, phone, email, group_id, source, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        churchId,
        name,
        phone,
        email || null,
        group_id || null,
        source || 'manual',
        status || 'active',
        metadata ? JSON.stringify(metadata) : null
      ];

      const result = await this.db.query(query, values);

      // Update group contact count if group_id provided
      if (group_id) {
        await this.db.query(
          'UPDATE sms_groups SET contact_count = contact_count + 1 WHERE id = $1',
          [group_id]
        );
      }

      this.success(res, { contact: result.rows[0] }, 201);
    } catch (error) {
      this.logger.error('createContact', error);
      this.error(res, 'Failed to create contact');
    }
  }

  /**
   * Update an existing contact
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Contact ID
   * @param {Object} req.body - Request body
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const { name, phone, email, group_id, status, metadata } = req.body;
      const churchId = req.user.church_id;

      // Validate phone number if provided
      if (phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
          return this.error(res, 'Invalid phone number format');
        }
      }

      // Get current contact to check group change
      const currentContact = await this.db.query(
        'SELECT group_id FROM sms_contacts WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (currentContact.rows.length === 0) {
        return this.error(res, 'Contact not found', 404);
      }

      const oldGroupId = currentContact.rows[0].group_id;

      const query = `
        UPDATE sms_contacts
        SET name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            email = COALESCE($4, email),
            group_id = COALESCE($5, group_id),
            status = COALESCE($6, status),
            metadata = COALESCE($7, metadata),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND church_id = $8
        RETURNING *
      `;
      const values = [
        id,
        name,
        phone,
        email,
        group_id,
        status,
        metadata ? JSON.stringify(metadata) : null,
        churchId
      ];

      const result = await this.db.query(query, values);

      // Update group contact counts if group changed
      if (oldGroupId !== group_id) {
        if (oldGroupId) {
          await this.db.query(
            'UPDATE sms_groups SET contact_count = contact_count - 1 WHERE id = $1',
            [oldGroupId]
          );
        }
        if (group_id) {
          await this.db.query(
            'UPDATE sms_groups SET contact_count = contact_count + 1 WHERE id = $1',
            [group_id]
          );
        }
      }

      this.success(res, { contact: result.rows[0] });
    } catch (error) {
      this.logger.error('updateContact', error);
      this.error(res, 'Failed to update contact');
    }
  }

  /**
   * Delete a contact
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Contact ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteContact(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      // Get contact to update group count
      const contact = await this.db.query(
        'SELECT group_id FROM sms_contacts WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      if (contact.rows.length === 0) {
        return this.error(res, 'Contact not found', 404);
      }

      const groupId = contact.rows[0].group_id;

      await this.db.query(
        'DELETE FROM sms_contacts WHERE id = $1 AND church_id = $2',
        [id, churchId]
      );

      // Update group contact count
      if (groupId) {
        await this.db.query(
          'UPDATE sms_groups SET contact_count = contact_count - 1 WHERE id = $1',
          [groupId]
        );
      }

      this.success(res, { message: 'Contact deleted successfully' });
    } catch (error) {
      this.logger.error('deleteContact', error);
      this.error(res, 'Failed to delete contact');
    }
  }

  /**
   * Export contacts to CSV
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async exportContacts(req, res) {
    try {
      const churchId = req.user.church_id;

      const query = `
        SELECT c.name, c.phone, c.email, c.source, c.status, g.name as group_name
        FROM sms_contacts c
        LEFT JOIN sms_groups g ON c.group_id = g.id
        WHERE c.church_id = $1
        ORDER BY c.created_at DESC
      `;
      const result = await this.db.query(query, [churchId]);

      // Convert to CSV
      const headers = ['Name', 'Phone', 'Email', 'Source', 'Status', 'Group'];
      const csvRows = [headers.join(',')];

      result.rows.forEach(row => {
        const values = [
          row.name,
          row.phone,
          row.email || '',
          row.source,
          row.status,
          row.group_name || ''
        ].map(value => `"${value}"`);
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
      res.send(csvContent);
    } catch (error) {
      this.logger.error('exportContacts', error);
      this.error(res, 'Failed to export contacts');
    }
  }

  /**
   * Import contacts from CSV/JSON
   * @param {Object} req - Express request object
   * @param {Object} req.file - Uploaded file
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async importContacts(req, res) {
    try {
      if (!req.file) {
        return this.error(res, 'No file uploaded');
      }

      const churchId = req.user.church_id;
      const importType = req.file.mimetype.includes('json') ? 'json' : 'csv';

      let contacts;
      if (importType === 'json') {
        const content = req.file.buffer.toString();
        const data = JSON.parse(content);
        contacts = data.contacts || [];
      } else {
        // Parse CSV (simplified - in production use a proper CSV parser)
        const content = req.file.buffer.toString();
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        contacts = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',');
          const contact = {};
          headers.forEach((header, index) => {
            contact[header.trim()] = values[index]?.trim().replace(/"/g, '');
          });
          contacts.push(contact);
        }
      }

      let imported = 0;
      let failed = 0;
      const errors = [];

      for (const contactData of contacts) {
        try {
          // Validate required fields
          if (!contactData.name || !contactData.phone) {
            failed++;
            errors.push(`Missing required fields for: ${JSON.stringify(contactData)}`);
            continue;
          }

          // Validate phone format
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          if (!phoneRegex.test(contactData.phone)) {
            failed++;
            errors.push(`Invalid phone format: ${contactData.phone}`);
            continue;
          }

          // Check if group exists, create if not
          let groupId = null;
          if (contactData.group) {
            const groupResult = await this.db.query(
              'SELECT id FROM sms_groups WHERE name = $1 AND church_id = $2',
              [contactData.group, churchId]
            );

            if (groupResult.rows.length > 0) {
              groupId = groupResult.rows[0].id;
            } else {
              // Create new group
              const newGroup = await this.db.query(
                'INSERT INTO sms_groups (church_id, name, source) VALUES ($1, $2, $3) RETURNING id',
                [churchId, contactData.group, 'website']
              );
              groupId = newGroup.rows[0].id;
            }
          }

          // Insert contact
          await this.db.query(
            `INSERT INTO sms_contacts (church_id, name, phone, email, group_id, source, status, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              churchId,
              contactData.name,
              contactData.phone,
              contactData.email || null,
              groupId,
              'website',
              contactData.status || 'active',
              contactData.metadata ? JSON.stringify(contactData.metadata) : null
            ]
          );

          // Update group count
          if (groupId) {
            await this.db.query(
              'UPDATE sms_groups SET contact_count = contact_count + 1 WHERE id = $1',
              [groupId]
            );
          }

          imported++;
        } catch (error) {
          failed++;
          errors.push(`Failed to import ${contactData.name}: ${error.message}`);
        }
      }

      // Log import
      await this.db.query(
        `INSERT INTO import_logs (church_id, file_name, import_type, total_rows, imported_count, failed_count, errors, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [churchId, req.file.originalname, importType, contacts.length, imported, failed, JSON.stringify(errors), req.user.id]
      );

      this.success(res, {
        message: 'Import completed',
        imported,
        failed,
        total: contacts.length,
        errors: errors.slice(0, 10) // Return first 10 errors
      });
    } catch (error) {
      this.logger.error('importContacts', error);
      this.error(res, 'Failed to import contacts');
    }
  }
}

module.exports = new SMSContactsController();