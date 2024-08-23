/*
Codigo para conectar a una base de datos del navegador

const { Sequelize } = require('sequelize');

// Configuración para SQLite en memoria
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:', // Esto configura SQLite para usar una base de datos en memoria
});

module.exports = sequelize;*/


// Codigo para conectar a base de datos de Supabase

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgres', 'postgres.yxdyhyvjmpmgignjvwdo', 'Mantecada123*', {
  host: 'aws-0-us-west-1.pooler.supabase.com',
  dialect: 'postgres',
  port: 6543,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;

