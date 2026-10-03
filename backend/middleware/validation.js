/**
 * express-validator rule library + validate() error formatter.
 * @exports {validate, validateRequest, validationRules}
 * @known Dead exports removed (L416): commonValidations (isInt-only id rejected
 *        UUIDs), sanitizeInput (wildcard escape() would corrupt passwords),
 *        validateFile/validateLength/validatePattern (all unused). validateRequest
 *        never echoes err.value — failed password fields would leak back.
 */

const { body, validationResult, param } = require('express-validator');

/**
 * Validates request and returns formatted errors if validation fails
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      // Never echo err.value back — failed password/secret fields would leak
      // the submitted value to the client and into any logged response.
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  validate: validateRequest,
  validateRequest,
  validationRules: {
    idParam: [
      param('id').notEmpty().withMessage('ID is required')
    ],
    user: {
      update: [
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
        body('last_name').optional().notEmpty().withMessage('Last name cannot be empty')
      ],
      changePassword: [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        // Mirror helpers/security.js validatePasswordStrength so a weak password
        // fails here with a clear message instead of a different error later.
        body('newPassword')
          .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
          .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
          .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
          .matches(/[0-9]/).withMessage('New password must contain a number')
          .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain a special character')
      ]
    },
    announcement: {
      create: [
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required')
      ],
      update: [
        body('title').optional().notEmpty().withMessage('Title cannot be empty'),
        body('content').optional().notEmpty().withMessage('Content cannot be empty')
      ]
    },
    department: {
      create: [
        body('name').notEmpty().withMessage('Department name is required'),
        body('slug').notEmpty().withMessage('Department slug is required')
      ],
      addMember: [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('role').notEmpty().withMessage('Role is required')
      ]
    }
  }
};
