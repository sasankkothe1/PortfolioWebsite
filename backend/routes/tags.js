const router = require('express').Router();
const { getSuggestions } = require('../controllers/tagsController');

router.get('/suggestions', getSuggestions);

module.exports = router;
