const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Import models
const User = require('./User')(sequelize);
const Chat = require('./Chat')(sequelize);
const Message = require('./Message')(sequelize);
const ChatMember = require('./ChatMember')(sequelize);
const File = require('./File')(sequelize);
const Contact = require('./Contact')(sequelize);

// Define associations
// User associations
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
User.belongsToMany(Chat, { through: ChatMember, foreignKey: 'user_id', as: 'chats' });
User.hasMany(ChatMember, { foreignKey: 'user_id', as: 'chatMemberships' });
User.hasMany(Contact, { foreignKey: 'user_id', as: 'contacts' });
User.hasMany(Contact, { foreignKey: 'contact_user_id', as: 'contactOf' });

// Chat associations
Chat.belongsToMany(User, { through: ChatMember, foreignKey: 'chat_id', as: 'members' });
Chat.hasMany(Message, { foreignKey: 'chat_id', as: 'messages' });
Chat.hasMany(ChatMember, { foreignKey: 'chat_id', as: 'memberships' });
Chat.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Message associations
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });
Message.belongsTo(Message, { foreignKey: 'reply_to_id', as: 'replyTo' });
Message.hasMany(Message, { foreignKey: 'reply_to_id', as: 'replies' });
Message.hasMany(File, { foreignKey: 'message_id', as: 'files' });

// ChatMember associations
ChatMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ChatMember.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });

// File associations
File.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
File.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Contact associations
Contact.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
Contact.belongsTo(User, { foreignKey: 'contact_user_id', as: 'contactUser' });

module.exports = {
  sequelize,
  User,
  Chat,
  Message,
  ChatMember,
  File,
  Contact
};