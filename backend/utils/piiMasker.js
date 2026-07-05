/**
 * PII Masking Utility (Phase 14)
 * Masks personally identifiable information in API responses
 * to prevent accidental data exposure in logs and client responses
 */

class PIIMasker {
  /**
   * Mask email address - shows first 2 chars and domain
   * @param {string} email - Email to mask
   * @returns {string} Masked email
   */
  static maskEmail(email) {
    if (!email || typeof email !== 'string') return email;
    
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    
    const visibleChars = Math.min(2, localPart.length);
    const masked = localPart.substring(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3));
    return `${masked}@${domain}`;
  }

  /**
   * Mask phone number - shows last 4 digits
   * @param {string} phone - Phone number to mask
   * @returns {string} Masked phone number
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return phone;
    
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    
    const visible = cleaned.slice(-4);
    const masked = '*'.repeat(Math.max(cleaned.length - 4, 6));
    return `${masked}${visible}`;
  }

  /**
   * Mask credit card number - shows last 4 digits
   * @param {string} cardNumber - Card number to mask
   * @returns {string} Masked card number
   */
  static maskCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') return cardNumber;
    
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return cardNumber;
    
    const visible = cleaned.slice(-4);
    const masked = '*'.repeat(Math.max(cleaned.length - 4, 12));
    return `${masked}${visible}`;
  }

  /**
   * Mask full name - shows first name initial and last name
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @returns {string} Masked name
   */
  static maskName(firstName, lastName) {
    if (!firstName && !lastName) return '';
    
    const maskedFirst = firstName ? firstName.charAt(0) + '*'.repeat(Math.max(firstName.length - 1, 2)) : '';
    const maskedLast = lastName || '';
    
    return `${maskedFirst} ${maskedLast}`.trim();
  }

  /**
   * Mask address - shows city and state only
   * @param {object} address - Address object
   * @returns {object} Masked address
   */
  static maskAddress(address) {
    if (!address || typeof address !== 'object') return address;
    
    const { city, state, country } = address;
    return {
      city: city || '',
      state: state || '',
      country: country || '',
      fullAddress: '*** Restricted ***'
    };
  }

  /**
   * Mask sensitive fields in an object based on field names
   * @param {object} data - Object to mask
   * @param {array} fields - Array of field names to mask
   * @returns {object} Object with masked fields
   */
  static maskFields(data, fields = []) {
    if (!data || typeof data !== 'object') return data;
    
    const masked = { ...data };
    const defaultFields = ['email', 'phone', 'phoneNumber', 'mobile', 'creditCard', 'ssn', 'password'];
    const fieldsToMask = [...defaultFields, ...fields];
    
    fieldsToMask.forEach(field => {
      if (masked[field]) {
        const value = masked[field];
        
        if (field.toLowerCase().includes('email')) {
          masked[field] = this.maskEmail(value);
        } else if (field.toLowerCase().includes('phone') || field.toLowerCase().includes('mobile')) {
          masked[field] = this.maskPhone(value);
        } else if (field.toLowerCase().includes('card')) {
          masked[field] = this.maskCardNumber(value);
        } else if (field.toLowerCase().includes('password') || field.toLowerCase().includes('ssn')) {
          masked[field] = '***';
        }
      }
    });
    
    return masked;
  }

  /**
   * Mask PII in API response data
   * @param {object} data - Response data to mask
   * @param {object} options - Masking options
   * @returns {object} Masked response data
   */
  static maskResponse(data, options = {}) {
    const { 
      maskEmail: shouldMaskEmail = true, 
      maskPhone: shouldMaskPhone = true,
      maskName: shouldMaskName = false,
      customFields = []
    } = options;
    
    if (!data || typeof data !== 'object') return data;
    
    const masked = JSON.parse(JSON.stringify(data)); // Deep clone
    
    // Handle arrays
    if (Array.isArray(masked)) {
      return masked.map(item => this.maskResponse(item, options));
    }
    
    // Handle single object
    if (shouldMaskEmail && masked.email) {
      masked.email = this.maskEmail(masked.email);
    }
    
    if (shouldMaskPhone && (masked.phone || masked.phoneNumber || masked.mobile)) {
      if (masked.phone) masked.phone = this.maskPhone(masked.phone);
      if (masked.phoneNumber) masked.phoneNumber = this.maskPhone(masked.phoneNumber);
      if (masked.mobile) masked.mobile = this.maskPhone(masked.mobile);
    }
    
    if (shouldMaskName && masked.firstName && masked.lastName) {
      masked.firstName = this.maskName(masked.firstName, masked.lastName).split(' ')[0];
      masked.lastName = this.maskName(masked.firstName, masked.lastName).split(' ')[1] || '';
    }
    
    // Mask custom fields
    if (customFields.length > 0) {
      customFields.forEach(field => {
        if (masked[field]) {
          masked[field] = '***';
        }
      });
    }
    
    return masked;
  }

  /**
   * Create a middleware function for Express to mask PII in responses
   * @param {object} options - Masking options
   * @returns {function} Express middleware
   */
  static middleware(options = {}) {
    return (req, res, next) => {
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to mask PII
      res.json = function(data) {
        const maskedData = PIIMasker.maskResponse(data, options);
        return originalJson(maskedData);
      };
      
      next();
    };
  }
}

module.exports = PIIMasker;
