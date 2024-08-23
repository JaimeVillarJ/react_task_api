const { DataTypes } = require('sequelize'); // Importa los tipos de datos de Sequelize
const sequelize = require('./database'); // Importa la instancia de Sequelize configurada en otro archivo

// Define el modelo Task
const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING, // Tipo de datos: cadena de texto
    allowNull: false, // No se permite que este campo sea nulo
  },
  description: {
    type: DataTypes.TEXT, // Tipo de datos: texto largo
    allowNull: true, // Este campo puede ser nulo
  },
  status: {
    type: DataTypes.STRING, // Tipo de datos: cadena de texto
    allowNull: false, // No se permite que este campo sea nulo
  },
  userId: {
    type: DataTypes.INTEGER, // Tipo de datos: entero
    allowNull: false, // No se permite que este campo sea nulo
    references: {
      model: 'Users', // Nombre de la tabla de usuarios en la base de datos
      key: 'id', // Campo de referencia en la tabla de usuarios
    },
  },
});

// Exporta el modelo para usarlo en otras partes de la aplicación
module.exports = Task;
