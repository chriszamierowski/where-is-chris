var express = require('express');
var router = express.Router();
var google = require('googleapis');
var request = require('request');

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

/* GET home page. */

router.get('/', function(req, res) {
  getEvents(function(body){
    console.log('body.items',body.items);
    res.render('index', {
      title: 'Express',
      items: body.items
    });
  });
});

module.exports = router;
