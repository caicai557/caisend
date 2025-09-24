const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    chat_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'poll', 'system'),
      defaultValue: 'text'
    },
    reply_to_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    forwarded_from_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    edited_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    reactions: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    read_by: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    delivered_to: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    tableName: 'messages',
    paranoid: true
  });

  return Message;
};