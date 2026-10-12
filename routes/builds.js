const express = require('express');
const { randomUUID } = require('crypto');
const Build = require('../models/Build');

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilterConditions(query) {
  const conditions = [];

  if (query.name) {
    conditions.push({ name: { $regex: escapeRegex(query.name), $options: 'i' } });
  }

  const character = query.character || query.character_id || query.chara_id;
  if (character) {
    conditions.push({
      $or: [
        { 'character.id': character },
        { 'character.name': { $regex: escapeRegex(character), $options: 'i' } },
        { 'character.name_en': { $regex: escapeRegex(character), $options: 'i' } },
        { character }
      ]
    });
  }

  const card = query.card || query.card_id;
  if (card) {
    conditions.push({
      $or: [
        { 'supportCards.id': card },
        { 'supportCards.name': { $regex: escapeRegex(card), $options: 'i' } },
        { 'supportCards.name_en': { $regex: escapeRegex(card), $options: 'i' } },
        { supportCards: card }
      ]
    });
  }

  return conditions.length ? { $and: conditions } : {};
}

function isValidBuildInput({ name, character, supportCards }) {
  return typeof name === 'string' && name.trim().length > 0 &&
    character !== undefined && character !== null &&
    Array.isArray(supportCards) && supportCards.length === 6;
}

router.post('/', async (req, res) => {
  const { name, character, supportCards } = req.body;
  if (!isValidBuildInput({ name, character, supportCards })) {
    return res.status(400).json({
      error: 'A name, character, and exactly 6 support cards are required'
    });
  }

  try {
    const build = await Build.create({
      buildId: randomUUID(),
      name: name.trim(),
      character,
      supportCards
    });
    res.status(201).json(build);
  } catch (error) {
    console.error('Error saving build:', error);
    res.status(500).json({ error: 'Failed to save build' });
  }
});

router.get(['/', '/filter'], async (req, res) => {
  try {
    const data = await Build.find(buildFilterConditions(req.query)).sort({ createdAt: -1 });
    res.json({ total: data.length, filters: req.query, data });
  } catch (error) {
    console.error('Error fetching builds:', error);
    res.status(500).json({ error: 'Failed to fetch builds' });
  }
});

router.get('/:buildId', async (req, res) => {
  try {
    const build = await Build.findOne({ buildId: req.params.buildId });
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(build);
  } catch (error) {
    console.error('Error fetching build:', error);
    res.status(500).json({ error: 'Failed to fetch build' });
  }
});

router.patch('/:buildId', async (req, res) => {
  const allowedFields = ['name', 'character', 'supportCards'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([field]) => allowedFields.includes(field))
  );

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Provide name, character, or supportCards to update' });
  }
  if ('name' in updates && (typeof updates.name !== 'string' || !updates.name.trim())) {
    return res.status(400).json({ error: 'Name must be a non-empty string' });
  }
  if ('supportCards' in updates &&
      (!Array.isArray(updates.supportCards) || updates.supportCards.length !== 6)) {
    return res.status(400).json({ error: 'A build must have exactly 6 support cards' });
  }
  if ('name' in updates) updates.name = updates.name.trim();

  try {
    const build = await Build.findOneAndUpdate(
      { buildId: req.params.buildId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(build);
  } catch (error) {
    console.error('Error updating build:', error);
    res.status(500).json({ error: 'Failed to update build' });
  }
});

router.delete('/:buildId', async (req, res) => {
  try {
    const build = await Build.findOneAndDelete({ buildId: req.params.buildId });
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json({ message: 'Build deleted', buildId: build.buildId });
  } catch (error) {
    console.error('Error deleting build:', error);
    res.status(500).json({ error: 'Failed to delete build' });
  }
});

module.exports = router;