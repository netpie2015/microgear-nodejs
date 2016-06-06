#!/usr/bin/env node

var MicroGear = require('../../index.js');

/* --- mg1 --------------------------------- */
var mg1 = MicroGear.create({
    key    : <KEY1>,
    secret : <SECRET1>,
    alias  : "mg1"
});

mg1.on('connected', function() {
    console.log('mg1 connected...');
    setInterval(function() {
        mg1.chat('mg2', 'Hello from mg1.');
    },5000);
});

mg1.on('message', function(topic,msg) {
    console.log('mg1 receives :' + msg);
});

mg1.connect(<APPID>);

/* --- mg2 --------------------------------- */
var mg2 = MicroGear.create({
    key    : <KEY2>,
    secret : <SECRET2>,
    alias  : "mg2"
});

mg2.on('connected', function() {
    console.log('mg2 connected...');
    setInterval(function() {
        mg1.chat('mg1', 'Hello from mg2.');
    },5000);
});

mg2.on('message', function(topic,msg) {
    console.log('mg2 receives :'+ msg);
});

mg2.connect(<APPID>);
