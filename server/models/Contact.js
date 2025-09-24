const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contact = sequelize.define('Contact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    contact_user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    nickname: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'contacts',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'contact_user_id']
      }
    ]
  });

  return Contact;
};