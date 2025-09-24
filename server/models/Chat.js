const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('private', 'group', 'channel', 'saved'),
      allowNull: false,
      defaultValue: 'private'
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    invite_link: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    member_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pinned_message_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        mute_notifications: false,
        auto_delete_messages: null,
        allow_member_invites: true,
        require_admin_approval: false,
        slow_mode_seconds: 0
      }
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'chats',
    paranoid: true
  });

  return Chat;
};