const express = require('express');
const router = express.Router();
const { createOrder, getOrdersByDate, deleteOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(protect);

router.get('/', requirePermission('breakfast.view'), getOrdersByDate);
router.post('/', requirePermission('breakfast.manage'), createOrder);
router.delete('/:id', requirePermission('breakfast.manage'), deleteOrder);

module.exports = router;
