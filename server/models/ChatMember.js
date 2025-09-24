const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMember = sequelize.define('ChatMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    chat_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member'),
      defaultValue: 'member'
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    last_read_message_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    unread_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_muted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    muted_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        send_messages: true,
        send_media: true,
        add_members: false,
        change_info: false,
        pin_messages: false,
        delete_messages: false
      }
    }
  }, {
    tableName: 'chat_members',
    indexes: [
      {
        unique: true,
        fields: ['chat_id', 'user_id']
      }
    ]
  });

  return ChatMember;
};