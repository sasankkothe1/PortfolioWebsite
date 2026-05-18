const router = require('express').Router();
const { listFeed, listMedia, getMediaById, uploadMedia, updateMedia, deleteMedia } = require('../controllers/mediaController');
const verifyJWT = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/feed', listFeed);
router.get('/', listMedia);
router.get('/:id', getMediaById);
router.post('/', verifyJWT, upload.single('file'), uploadMedia);
router.patch('/:id', verifyJWT, updateMedia);
router.delete('/:id', verifyJWT, deleteMedia);

module.exports = router;
