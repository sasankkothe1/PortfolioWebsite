const router = require('express').Router();
const { listMedia, uploadMedia, deleteMedia } = require('../controllers/mediaController');
const verifyJWT = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', listMedia);
router.post('/', verifyJWT, upload.single('file'), uploadMedia);
router.delete('/:id', verifyJWT, deleteMedia);

module.exports = router;
