'use strict';

require('dotenv').config()

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const cors = require('cors');

const ShortURL = require('./models/short-url.model');

mongoose.Promise = global.Promise;

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true, autoIndex: true });

/** this project needs to parse POST bodies **/
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(cors());


app.use('/public', express.static(process.cwd() + '/public'));


app.post('/api/shorturl/new', urlencodedParser, checkSubmissionForDuplicate, checkURLValidity, saveURL);


app.get('/api/shorturl/:short_url', checkShortIdValidity, performRedirection);


app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", (req, res) => {
  res.json({ greeting: 'hello API' });
});


app.listen(port, () => {
  console.log('Node.js listening ...');
});


/** Redirect to full URL if possible */
function performRedirection(req, res) {
  ShortURL.findOne({ shortId: req.params.short_url }).exec((err, shortUrl) => {
    if (err) {
      res.send('Something has gone wrong, please try again later');
      return;
    }

    if (!shortUrl) {
      res.send('Entered shortened URL does not exist!');
      return;
    }
    
    res.redirect(shortUrl.url);

  })
}


/** Check if provided shortId is valid */
function checkShortIdValidity(req, res, next) {
  const isValidId = Number.isInteger(Number(req.params.short_url));
  if (!isValidId) {
    res.send('Error! Invalid short url provided! Please, try again.');
    return;
  }
  next();
}


/** Save new submitted URL to the database */
function saveURL(req, res) {
  ShortURL.find().sort({ shortId: -1 }).limit(1).exec((err, docs) => {
    if(err){
      res.send('Something has gone wrong, please try again later.');
      return;
    }

    const doc = docs[0] ? docs[0]._doc : { url: null, shortId: 0 };
    /** Get a new shortId */
    const shortId = doc.shortId + 1;

    const newShortenedURL = new ShortURL({
      shortId,
      url: req.body.url
    });

    newShortenedURL.save((err) => {
      if (err) {
        res.send('Error saving submitted URL! Please, try again.');
        return;
      }
      res.send(getResponseShortenedURLJson(newShortenedURL));
    });
  });
};


/** Check if submitted url already exists in the db */
function checkSubmissionForDuplicate(req, res, next) {
  const submittedURL = req.body.url;
  ShortURL.findOne(({ url: submittedURL })).exec((err, doc) => {
    if (doc) {
      res.json(getResponseShortenedURLJson(doc));
      return;
    }
    next();
  });
}


/** Check if submitted url was valid */
function checkURLValidity(req, res, next) {
  const submittedURL = req.body.url;
  const isValidURLString = /^https?:\/\/((www)\d*\.)?\w+(\.\w{2,})+\/?((\/\w+\/?)+)?$/.test(submittedURL);

  if (!isValidURLString) {
    res.json({ "error": "invalid URL" });
    return;
  }

  const submittedHost = submittedURL.replace(/.*\/\//, '').replace(/\/.*/, '');
  dns.lookup(submittedHost, function (err, addresses, family) {
    if (err) {
      res.json({ "error": "invalid URL" });
      return;
    }
    next();
  });
}


/** Get success response for submitted url */
function getResponseShortenedURLJson(shortenedUrl) {
  return { "original_url": shortenedUrl.url, "short_url": shortenedUrl.shortId };
}
