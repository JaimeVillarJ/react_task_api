const { DataTypes } = require('sequelize'); // Importa los tipos de datos de Sequelize
const sequelize = require('./database'); // Importa la instancia de Sequelize configurada en otro archivo

// Define el modelo User
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING, // Tipo de datos: cadena de texto
    allowNull: false, // No se permite que este campo sea nulo
    unique: true, // Valor único en la base de datos (no se permiten duplicados)
  },
  email: {
    type: DataTypes.STRING, // Tipo de datos: cadena de texto
    allowNull: false, // No se permite que este campo sea nulo
    unique: true, // Valor único en la base de datos (no se permiten duplicados)
  },
  password: {
    type: DataTypes.STRING, // Tipo de datos: cadena de texto
    allowNull: false, // No se permite que este campo sea nulo
  },
});

// Exporta el modelo para usarlo en otras partes de la aplicación
module.exports = User;
