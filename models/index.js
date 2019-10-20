'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config.json');
let db = {};

const sequelize = new Sequelize(config.db)

sequelize
    .authenticate()
    .then(function (err) {
        console.log('Connection has been established successfully.');
    })
    .catch(function (err) {
        console.log('Unable to connect to the database:', err);
    });

fs.readdirSync(__dirname, { withFileTypes: true })
    .filter(file => file.name.endsWith('.model.js'))
    .forEach(function (file) {
        const model = sequelize['import'](path.join(__dirname, file.name));
        db[model.name] = model;
    });
Object.keys(db).forEach(function (modelName) {
    if (db[modelName].associate) db[modelName].associate(db)
});


db.sequelize = sequelize;
db.Sequelize = Sequelize;
const force = process.argv.includes("reset") || false
db.sequelize.sync({ force: force, logging: false })

module.exports = db;