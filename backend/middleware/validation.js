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
      // trim() first so a whitespace-only id fails notEmpty instead of passing.
      param('id').trim().notEmpty().withMessage('ID is required')
    ],
    user: {
      update: [
        body('email').optional().trim().isEmail().withMessage('Invalid email'),
        body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty'),
        body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty')
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
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('content').trim().notEmpty().withMessage('Content is required')
      ],
      update: [
        body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
        body('content').optional().trim().notEmpty().withMessage('Content cannot be empty')
      ]
    },
    department: {
      create: [
        // slug is derived from name inside the route — requiring it in the
        // body rejected every legitimate create call.
        body('name').trim().notEmpty().withMessage('Department name is required'),
        body('slug').optional().trim()
      ],
      addMember: [
        body('userId').trim().notEmpty().withMessage('User ID is required'),
        body('role').trim().notEmpty().withMessage('Role is required')
      ]
    }
  }
};
