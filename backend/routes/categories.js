const router = require('express').Router();
const { listCategories, createCategory } = require('../controllers/categoriesController');
const verifyJWT = require('../middleware/auth');

router.get('/', listCategories);
router.post('/', verifyJWT, createCategory);

module.exports = router;
