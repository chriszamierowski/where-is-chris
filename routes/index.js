var express = require('express');
var router = express.Router();
var google = require('googleapis');
var request = require('request');

var monthsByName = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

var monthsByNumber = {
  0 : 'january',
  1 : 'february',
  2 : 'march',
  3 : 'april',
  4 : 'may',
  5 : 'june',
  6 : 'july',
  7 : 'august',
  8 : 'september',
  9 : 'october',
  10 : 'november',
  11 : 'december'
};

function getEvents(callback) {
  request({
    url:'https://www.googleapis.com/calendar/v3/calendars/'+process.env.GOOGLE_CALENDAR_ID+'/events?key='+process.env.GOOGLE_CALENDAR_API_KEY,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    }
  });
}

function daysInMonth(month,year) {
  return new Date(year, month + 1, 0).getDate();
}

function handleRequest(req, res) {
  var currentDate = new Date(),
      currentMonth = currentDate.getMonth(),
      currentYear = currentDate.getFullYear(),
      month = req.params.month,
      englishMonth,
      year = currentYear;

  //get a month from url, otherwise use current
  if(month) {
    if(monthsByName[month] === undefined) {
      res.redirect('/');
      return;
    } else {
      month = monthsByName[month];
    }
  } else {
    month = currentMonth;
  }

  //get the year of the next time that month occurs
  if(currentMonth > month) {
    year++;
  }

  englishMonth = monthsByNumber[month];

  console.log('month:',month);
    console.log('year:',year);

  getEvents(function(body){
    console.log('body.items',body.items);
    res.render('index', {
      title: 'Express',
      items: body.items,
      englishMonth: englishMonth,
      prevMonth: findPrevMonth(month, currentMonth),
      nextMonth: findNextMonth(month, currentMonth),
      year: year,
      days: daysInMonth(month, year)
    });
  });
}

function findPrevMonth(month, currentMonth) {
  //don't show past months
  if(month === currentMonth) {
    return null;
  } else {
    return monthsByNumber[Math.abs(month + 11) % 12];
  }
}

function findNextMonth(month, currentMonth) {
  //don't show more than a year ahead
  var next = Math.abs(month + 1) % 12;

  if(next === currentMonth) {
    return null;
  } else {
    return monthsByNumber[next];
  }
}
/* GET home page. */

router.get('/', handleRequest);

router.get('/:month', handleRequest);

module.exports = router;
