import express from 'express';
import Handlebars from 'handlebars';
import expressHandlebars from 'express-handlebars';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import MarkdownIt from 'markdown-it';

import FoodDb from './food-db.js';

import { format, add, startOfWeek, endOfWeek } from 'date-fns';

const app = express();

const foodDb = new FoodDb();

const md = new MarkdownIt();

app.use(bodyParser.urlencoded({extended: true}));

app.enable('strict routing');

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views/');
app.engine('hbs', expressHandlebars({
  extname: 'hbs',
  defaultLayout: 'default',
  handlebars: Handlebars,
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    'md': (data) => new Handlebars.SafeString(md.render(data)),
    'logEntryPrettyDate': function() {
      return formatDatePretty(Date.parse(this.entryMonth + '-' + this.entryDay));
    }
  },
  compilerOptions: {
    preventIndent: true
  }
}));

app.get('/', async (req, res) => {

  const now = Date.now();

  const firstDayOfThisWeek = startOfWeek(now);
  const lastDayOfThisWeek = endOfWeek(now);

  const monthsToFetch = [
    firstDayOfThisWeek.toISOString().slice(0, 7),
    lastDayOfThisWeek.toISOString().slice(0, 7)
  ].filter(function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  });

  const foodLog = await foodDb.fetchLogForMonths(monthsToFetch);

  console.log(foodLog);

  const data = {
    food: foodLog.reverse()
  };

  res.render('home', data);
});

app.get('/submit/', async (req, res) => {
  res.redirect('/submit/' + formatDateLink(Date.now()) + '/');
});

app.get('/submit/:year-:month-:day/', async (req, res) => {

  const year = req.params.year;
  const month = req.params.month;
  const day = req.params.day;

  if (isDateValid(year, month, day)) {
    res.status(404);
    res.send("Not found");
    return;
  }

  const dateString = req.params.year + '-' + req.params.month + '-' + req.params.day;

  const givenDate = Date.parse(dateString);
  const dateBefore = add(givenDate, { days: -1});
  const dateAfter = add(givenDate, { days: 1});

  const foodLog = await foodDb.fetchLogForDay(year + '-' + month, day);

  console.log(foodLog);

  res.render('submit', {
    date: {
      label: formatDatePretty(givenDate),
      link: '/submit/' + formatDateLink(givenDate) + '/',
      value: formatDateLink(givenDate)
    },
    prevDate: {
      label: formatDatePretty(dateBefore),
      link: '/submit/' + formatDateLink(dateBefore) + '/',
      value: formatDateLink(dateBefore)
    },
    nextDate: dateAfter < Date.now() ? {
      label: formatDatePretty(dateAfter),
      link: '/submit/' + formatDateLink(dateAfter) + '/',
      value: formatDateLink(dateAfter)
    } : null,
    entry: foodLog
  });
});

app.post('/submit/:year-:month-:day/', async (req, res) => {

  const year = req.params.year;
  const month = req.params.month;
  const day = req.params.day;

  if (isDateValid(year, month, day)) {
    res.status(404);
    res.send("Not found");
    return;
  }

  await foodDb.updateEntry(year + "-" + month, day, req.body);

  res.redirect(`/submit/${year}-${month}-${day}/`);

});

app.post('/submit/:year-:month-:day/delete/', async (req, res) => {

  const year = req.params.year;
  const month = req.params.month;
  const day = req.params.day;

  if (isDateValid(year, month, day)) {
    res.status(404);
    res.send("Not found");
    return;
  }

  await foodDb.deleteEntry(year + "-" + month, day, req.body);

  res.redirect(`/submit/${year}-${month}-${day}/`);

});

function isDateValid(year, month, day) {

  return /^\d{4}$/.test(year)
    && !/^\d{2}/.test(month)
    && !/^\d{2}/.test(day);

}

function formatDatePretty(date) {
  return format(date, 'EEEE, do MMMM yyyy');
}

function formatDateLink(date) {
  return format(date, 'yyyy-MM-dd');
}

module.exports = app;
