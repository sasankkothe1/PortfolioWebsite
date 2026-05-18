const router = require('express').Router();
const { getCarousel, createCarousel, deleteCarousel } = require('../controllers/carouselsController');
const verifyJWT = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/:id', getCarousel);
router.post('/', verifyJWT, upload.array('files', 30), createCarousel);
router.delete('/:id', verifyJWT, deleteCarousel);

module.exports = router;
