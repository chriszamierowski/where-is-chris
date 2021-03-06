var express = require('express');
var router = express.Router();
var google = require('googleapis');
var request = require('request');
var _ = require('lodash');
var ColorScheme = require('color-scheme');

var scheme = new ColorScheme;
    scheme.from_hex('83EBF1')
          .scheme('analogic')
          .add_complement(true)
          .distance(1)
          .variation('soft');

var colors = scheme.colors();

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

function pickColor() {
  return hexToRgba(colors[Math.floor(Math.random()*colors.length)], 0.8);
}

function hexToRgba(hex, a) {
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    return 'rgba('+r + ',' + g + ',' + b+', '+a+')';
}

function getEvents(callback) {
  request({
    url:'https://www.googleapis.com/calendar/v3/calendars/'+process.env.GOOGLE_CALENDAR_ID+'/events?key='+process.env.GOOGLE_CALENDAR_API_KEY+'&location=34,-118',
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(body);
    }
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonth(year, month, daysInMonth) {
  var date = new Date(year, month),
      firstDay = date.getDay(),
      days = [
        []
      ],
      daysInWeek = 7,
      w = 0,
      d = 1,
      dCounter = 0;

  while (d <= daysInMonth) {
    w = Math.floor(dCounter/daysInWeek);

    if(!days[w]) {
      days.push([])
    }
    if(dCounter < firstDay) {
      days[0][dCounter%daysInWeek] = null;
    } else {
      days[w][dCounter%daysInWeek] = {
        date: new Date(year, month, d)
      };
      d++;
    }

    dCounter++;
  }

  return days;
}

function handleRequest(req, res) {
  var currentDate = new Date(),
      currentMonth = currentDate.getMonth(),
      currentYear = currentDate.getFullYear(),
      month = req.params.month,
      englishMonth,
      year = currentYear,
      daysInMonth,
      formattedMonth;

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
  daysInMonth = getDaysInMonth(year, month);
  formattedMonth = formatMonth(year, month, daysInMonth);

  getEvents(function (body){

    formatEvents(body.items, year, month, formattedMonth);

    res.render('index', {
      title: 'Where is Chris in '+englishMonth.charAt(0).toUpperCase() + englishMonth.slice(1)+'?',
      heading: englishMonth+' '+year,
      prevMonth: findPrevMonth(month, currentMonth),
      nextMonth: findNextMonth(month, currentMonth),
      formattedMonth: formattedMonth
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

function formatEvents(events, year, month, formattedMonth) {
  var e,
      event,
      w,
      d,
      tempEnd,
      monthStart = new Date(year, month, 1, 0, 0, 0),
      monthEnd = new Date(year, month+1, 0, 23, 59, 59),
      duration;

  // simplify gcal obj
  events = events.map((e) => {
    tempEnd = new Date(e.end.date.split('-'));
    // gcal considers an event to end the after the last day
    // make it the day of so it's easier to render
    tempEnd.setTime(tempEnd.getTime() - 1, 0, 0, 0);

    return {
      name: e.summary,
      start: new Date(e.start.date.split('-')),
      end: tempEnd
    };
  });

  // triple for loops with a while inside seems efficient!
  for(e in events) {
    event = events[e];

    //(event starts this month) || (event ends this month)
    if((monthStart <= event.start && monthEnd >= event.start) || (monthStart <= event.end && monthEnd >= event.end)) {
      for(w = 0; w < formattedMonth.length; w++) {
        for(d = 0; d < formattedMonth[w].length; d++) {
          // (event already account for && date exists) && ((event start before date || event day before day because of gcal weirdness with what timezone it returns))
          if((!event.addedToCal && formattedMonth[w][d]) && ((event.start <= formattedMonth[w][d].date) || (event.start.getDate() <= formattedMonth[w][d].date.getDate()))) {
            //how long does this event last?
            duration = Math.floor((event.end - (event.start > monthStart ? event.start : monthStart))/(1000*60*60*24) + 1);
            event.addedToCal = true;
            event.duration = duration;
            event.color = pickColor();
            formattedMonth[w][d].event = _.clone(event);
            
            //check for wrapping events
            while(formattedMonth[w] && duration > (formattedMonth[w].length-d)) {
              formattedMonth[w][d].event.duration = formattedMonth[w].length-d;
              duration = duration - (formattedMonth[w].length-d);

              if(formattedMonth[w+1]) {
                w++;
                d=0;
                event.duration = duration;
                formattedMonth[w][0].event = _.clone(event);
              }
            }
          }
        }
      }
    }
  }
}

router.get('/', handleRequest);
router.get('/:month', handleRequest);

module.exports = router;
