const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('umaWeb is working!' +
    '\n\nAvailable endpoints:\n' +
    '/characters - Get a list of characters with their images\n' +
    '/characters/:id - Get one character by ID\n' +
    '/supportcards - Get all support cards\n' +
    '/supportcards/:id - Get one support card by ID\n' +
    '/builds - Create, list, edit, and delete saved builds\n' +
    '/builds/:buildId - Get one saved build by ID\n' +
    '/builds/filter?name=...&character=...&card=... - Filter saved builds\n' +
    '/supportcards/character/:charaId - Get support cards by character ID\n' +
    '/supportcards/type/:type - Get support cards by type\n' +
    '/supportcards/rarity/:rarity - Get support cards by rarity\n' +
    '/supportcards/filter?chara_id=...&type=...&rarity=... - Multiple combined filters\n'
  );
});

module.exports = router;