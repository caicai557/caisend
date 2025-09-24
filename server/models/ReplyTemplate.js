const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReplyTemplate = sequelize.define('ReplyTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    chat_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    trigger_keywords: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Keywords that trigger this reply'
    },
    reply_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    delay_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 300
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Higher priority templates are matched first'
    },
    match_type: {
      type: DataTypes.ENUM('exact', 'contains', 'regex', 'ai'),
      defaultValue: 'contains'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'reply_templates',
    indexes: [
      { fields: ['user_id', 'is_active'] },
      { fields: ['chat_id'] },
      { fields: ['priority'] }
    ]
  });

  return ReplyTemplate;
};