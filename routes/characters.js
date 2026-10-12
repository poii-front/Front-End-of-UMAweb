const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await fetch('https://umapyoi.net/api/v1/character/info');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const characters = await response.json();

    const data = await Promise.all(characters.map(async character => {
      const charaId = character.id || character.chara_id;
      let images = [];
      try {
        const imageResponse = await fetch(`https://umapyoi.net/api/v1/character/images/${charaId}`);
        if (imageResponse.ok) images = await imageResponse.json();
      } catch (error) {
        console.error(`Could not fetch images for character ID ${charaId}`);
      }
      return { id: charaId, name_en: character.name_en, images };
    }));

    res.json({ total: data.length, data });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch character data and images' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const response = await fetch('https://umapyoi.net/api/v1/character/info');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const characters = await response.json();
    const character = characters.find(item =>
      String(item.id || item.chara_id) === String(req.params.id)
    );

    if (!character) return res.status(404).json({ error: 'Character not found' });

    const charaId = character.id || character.chara_id;
    let images = [];
    try {
      const imageResponse = await fetch(`https://umapyoi.net/api/v1/character/images/${charaId}`);
      if (imageResponse.ok) images = await imageResponse.json();
    } catch (error) {
      console.error(`Could not fetch images for character ID ${charaId}`);
    }

    res.json({ id: charaId, name_en: character.name_en, images });
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Failed to fetch character data and images' });
  }
});

module.exports = router;