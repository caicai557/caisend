const express = require('express');
const { body, validationResult } = require('express-validator');
const { ReplyTemplate } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// 获取用户的回复模板
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { chat_id, is_active } = req.query;
    
    const where = { user_id: req.user.id };
    if (chat_id) where.chat_id = chat_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const templates = await ReplyTemplate.findAll({
      where,
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Failed to get templates' });
  }
});

// 创建回复模板
router.post('/templates', [
  authenticateToken,
  body('reply_text').notEmpty().withMessage('Reply text is required'),
  body('trigger_keywords').isArray().withMessage('Keywords must be an array'),
  body('delay_seconds').isInt({ min: 0, max: 300 }).withMessage('Delay must be 0-300 seconds'),
  body('match_type').isIn(['exact', 'contains', 'regex', 'ai']).withMessage('Invalid match type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await ReplyTemplate.create({
      ...req.body,
      user_id: req.user.id
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// 更新回复模板
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await template.update(req.body);
    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// 删除回复模板
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await ReplyTemplate.destroy({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (result === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// 获取回复统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const stats = await ReplyTemplate.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_templates'],
        [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_uses'],
        [sequelize.fn('AVG', sequelize.col('delay_seconds')), 'avg_delay']
      ],
      raw: true
    });

    const topUsed = await ReplyTemplate.findAll({
      where: { user_id: req.user.id },
      order: [['usage_count', 'DESC']],
      limit: 5
    });

    res.json({
      stats: stats[0],
      topUsed
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics' });
  }
});

// 测试回复匹配
router.post('/test-match', authenticateToken, async (req, res) => {
  try {
    const { message_text, chat_id } = req.body;

    if (!message_text) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    // 这里可以调用ReplyMatcher来测试匹配
    const ReplyMatcher = require('../services/ai-reply/ReplyMatcher');
    const matcher = new ReplyMatcher();
    
    const mockMessages = [{ content: message_text }];
    const bestReply = await matcher.findBestReply(
      mockMessages, 
      req.user.id, 
      chat_id
    );

    res.json({
      matched: !!bestReply,
      template: bestReply
    });
  } catch (error) {
    console.error('Test match error:', error);
    res.status(500).json({ message: 'Failed to test match' });
  }
});

module.exports = router;