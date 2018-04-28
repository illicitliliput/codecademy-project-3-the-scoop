'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var yaml = require('js-yaml');
var fs = require('fs');

function loadDatabase() {
    try {
        return yaml.safeLoad(fs.readFileSync('db.yml', 'utf8'));
    } catch (error) {
        console.log(error);
        return null;
    }
};

function saveDataBase(db) {
    try {
        return fs.writeFileSync('db.yml', yaml.safeDump(db), 'utf-8');
    } catch (error) {
        console.log(error);
        return null;
    }
}

exports.loadDatabase = loadDatabase;
exports.saveDataBase = saveDataBase;
