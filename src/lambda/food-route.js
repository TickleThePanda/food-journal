import express from 'express';
import Handlebars from 'handlebars';
import expressHandlebars from 'express-handlebars';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import MarkdownIt from 'markdown-it';

import FoodDb from './food-db.js';

import { format, add, isBefore, isAfter } from 'date-fns';

import bent from 'bent';

import { JWK, JWT } from 'jose';

const AUTH_KEY = JWK.asKey(process.env.TICKLETHEPANDA_AUTH_KEY);

const AUTH_URL = process.env.TICKLETHEPANDA_AUTH_URL;

const app = express();

const foodDb = new FoodDb();

const md = new MarkdownIt();

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

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

app.use(function auth(req, res, next) {

  const token = req.cookies.token;

  const authed = isAuthorisedToken(token);

  if (req.url !== '/login/' && !authed) {
    res.redirect('/login/');
  } else if (req.url === '/login/') {
    next();
  } else {
    const tokenPayload = token.split('.')[1];
    res.auth = JSON.parse(Buffer.from(tokenPayload, 'base64').toString('utf-8'));

    next();
  }
});

function isAuthorisedToken(token) {
  return token !== undefined && token !== null && JWT.verify(token, AUTH_KEY);
}

app.get('/login/', async (req, res) => {
  res.render('login');
});

app.post('/login/', async (req, res) => {
  const request = bent('POST', 'string', AUTH_URL, {
    'Authorization': 'Basic ' + Buffer.from(req.body.username + ':' + req.body.password).toString('base64')
  });

  const token = await request();

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: true,
    maxAge: (365 * 24 * 60 * 60)
  });

  res.redirect('/');
})

app.get('/', async (req, res) => {

  res.redirect('/log/' + formatDateLink(Date.now()) + '/');

});

app.get('/log/:year-:month-:day/', async (req, res) => {

  const year = req.params.year;
  const month = req.params.month;
  const day = req.params.day;

  if (isDateValid(year, month, day)) {
    res.status(404);
    res.send("Not found");
    return;
  }

  const dateString = req.params.year + '-' + req.params.month + '-' + req.params.day;
  const endOfWeekPeriod = Date.parse(dateString);

  const startOfWeekPeriod = add(endOfWeekPeriod, { days: -7 });

  const monthsToFetch = [
    formatMonth(endOfWeekPeriod),
    formatMonth(startOfWeekPeriod)
  ].filter(function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  });

  const foodLog = await foodDb.fetchLogForMonths(monthsToFetch);

  const endOfPreviousWeekPeriod = add(startOfWeekPeriod, { days: -1 });
  const endOfNextWeekPeriod = add(endOfWeekPeriod, { days: 8 });

  const startOfNextWeekPeriod = add(endOfWeekPeriod, { days: 1 });

  const data = {
    food: foodLog.reverse().filter(entry =>
      isAfter(Date.parse(entry.entryMonth + '-' + entry.entryDay), endOfPreviousWeekPeriod)
        && isBefore(Date.parse(entry.entryMonth + '-' + entry.entryDay), startOfNextWeekPeriod)
    ),
    prevDate: {
      label: "Previous week",
      title: formatDatePretty(endOfPreviousWeekPeriod),
      link: '/log/' + formatDateLink(endOfPreviousWeekPeriod) + '/',
      value: formatDateLink(endOfPreviousWeekPeriod)
    },
    nextDate: endOfNextWeekPeriod < Date.now() ? {
      label: "Next week",
      title: formatDatePretty(endOfNextWeekPeriod),
      link: '/log/' + formatDateLink(endOfNextWeekPeriod) + '/',
      value: formatDateLink(endOfNextWeekPeriod)
    } : null,
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

function formatMonth(date) {
  return format(date, 'yyyy-MM')
}

module.exports = app;
