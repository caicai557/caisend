const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        notifications: {
          message: true,
          mention: true,
          group: true
        },
        privacy: {
          last_seen: 'everyone',
          profile_photo: 'everyone',
          status: 'everyone'
        },
        theme: 'light',
        language: 'en'
      }
    },
    two_factor_secret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.toSafeObject = function() {
    const { password, two_factor_secret, ...safeUser } = this.toJSON();
    return safeUser;
  };

  return User;
};