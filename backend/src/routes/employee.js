const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  resetUserPassword,
  hardDeleteEmployee
} = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../middleware/rbac');

router.use(protect);

router.post('/', requirePermission('breakfast.employee.create'), createEmployee);
router.get('/', requirePermission('breakfast.employee.read'), getEmployees);
router.get('/:id', requirePermission('breakfast.employee.read'), getEmployeeById);
router.put('/:id', requirePermission('breakfast.employee.update'), updateEmployee);

// IT Admin or authorized password reset route
router.post('/:id/reset-password', requirePermission('user.password.reset'), resetUserPassword);

// Soft deactivate route (DELETE /api/employees/:id)
router.delete('/:id', requirePermission('breakfast.employee.deactivate'), deactivateEmployee);

// Exceptional IT_ADMIN only hard delete operation
router.post('/:id/hard-delete', requireRole('IT_ADMIN'), hardDeleteEmployee);

module.exports = router;
