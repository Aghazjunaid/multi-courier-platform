const router = require('express').Router();

router.get('/', (req, res) => {
  return res.json({
    success: true,
    message: 'Server is healthy'
  });
});

module.exports = router;
