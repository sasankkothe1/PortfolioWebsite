const router = require('express').Router();
const { listFeed, listMedia, getMediaById, uploadMedia, deleteMedia } = require('../controllers/mediaController');
const verifyJWT = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/feed', listFeed);
router.get('/', listMedia);
router.get('/:id', getMediaById);
router.post('/', verifyJWT, upload.single('file'), uploadMedia);
router.delete('/:id', verifyJWT, deleteMedia);

module.exports = router;
