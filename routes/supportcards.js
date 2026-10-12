const express = require('express');
const router = express.Router();

async function fetchAllSupportCards() {
  const response = await fetch('https://umapyoi.net/api/v1/support');
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const supportCardsSummary = await response.json();
  const supportCardsDetails = await Promise.all(
    supportCardsSummary.map(async card => {
      try {
        const detailResponse = await fetch(`https://umapyoi.net/api/v1/support/${card.id}`);
        if (detailResponse.ok) return await detailResponse.json();
      } catch (error) {
        console.error(`Could not fetch details for support card ID ${card.id}`);
      }
      return card;
    })
  );

  return supportCardsDetails.map(card => ({
    id: card.id,
    name_en: card.title_en || card.name || 'Unknown',
    chara_id: card.chara_id,
    rarity: card.rarity,
    rarityString: card.rarity_string,
    type: card.type,
    type_icon: card.type_icon_url
  }));
}

function filterCards(cards, query) {
  const { chara_id, type, rarity } = query;
  let filtered = [...cards];

  if (chara_id) {
    filtered = filtered.filter(card => String(card.chara_id) === String(chara_id));
  }
  if (type) {
    filtered = filtered.filter(card => card.type && card.type.toLowerCase() === type.toLowerCase());
  }
  if (rarity) {
    filtered = filtered.filter(card =>
      (card.rarityString && card.rarityString.toLowerCase() === rarity.toLowerCase()) ||
      String(card.rarity) === String(rarity)
    );
  }

  return filtered;
}

router.get('/', async (req, res) => {
  try {
    const data = await fetchAllSupportCards();
    res.json({ total: data.length, data });
  } catch (error) {
    console.error('Error fetching support cards:', error);
    res.status(500).json({ error: 'Failed to fetch support card data' });
  }
});

router.get('/character/:charaId', async (req, res) => {
  try {
    const { charaId } = req.params;
    const data = (await fetchAllSupportCards())
      .filter(card => String(card.chara_id) === String(charaId));
    res.json({ total: data.length, chara_id: charaId, data });
  } catch (error) {
    console.error('Error filtering support cards by character:', error);
    res.status(500).json({ error: 'Failed to filter by character' });
  }
});

router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const data = (await fetchAllSupportCards())
      .filter(card => card.type && card.type.toLowerCase() === type.toLowerCase());
    res.json({ total: data.length, type, data });
  } catch (error) {
    console.error('Error filtering support cards by type:', error);
    res.status(500).json({ error: 'Failed to filter by type' });
  }
});

router.get('/rarity/:rarity', async (req, res) => {
  try {
    const { rarity } = req.params;
    const data = (await fetchAllSupportCards()).filter(card =>
      (card.rarityString && card.rarityString.toLowerCase() === rarity.toLowerCase()) ||
      String(card.rarity) === String(rarity)
    );
    res.json({ total: data.length, rarity, data });
  } catch (error) {
    console.error('Error filtering support cards by rarity:', error);
    res.status(500).json({ error: 'Failed to filter by rarity' });
  }
});

router.get('/filter', async (req, res) => {
  try {
    const data = filterCards(await fetchAllSupportCards(), req.query);
    res.json({ total: data.length, filters: req.query, data });
  } catch (error) {
    console.error('Error with multi-filtering support cards:', error);
    res.status(500).json({ error: 'Failed to filter support cards' });
  }
});

router.get('/:cardId', async (req, res) => {
  try {
    const response = await fetch(`https://umapyoi.net/api/v1/support/${req.params.cardId}`);
    if (response.status === 404) return res.status(404).json({ error: 'Support card not found' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const card = await response.json();
    res.json({
      id: card.id,
      name_en: card.title_en || card.name || 'Unknown',
      chara_id: card.chara_id,
      rarity: card.rarity,
      rarityString: card.rarity_string,
      type: card.type,
      type_icon: card.type_icon_url
    });
  } catch (error) {
    console.error('Error fetching support card:', error);
    res.status(500).json({ error: 'Failed to fetch support card data' });
  }
});

module.exports = router;