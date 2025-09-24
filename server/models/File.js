const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    message_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    thumbnail_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'files'
  });

  return File;
};