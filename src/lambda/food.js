const express = require('express');
const hbs = require('express-handlebars');

const app = express();

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views/');
app.engine( 'hbs', hbs({
  extname: 'hbs',
  defaultLayout: 'default',
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/'
}));

app.get('/', (req, res) => {
  res.render('home');
})

module.exports = app;