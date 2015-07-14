#!/usr/bin/env node

var MicroGear = require('microgear');


const APPKEY    = "qDDwMaHEXfBiXmL";
const APPSECRET = "vNoswuhfqjxWSm0GR7cycGPniekw03";
const APPID     = "piedemo";



var microgear = MicroGear.create({
    gearkey : APPKEY,
    gearsecret : APPSECRET
});

microgear.on('connected', function() {
    console.log('Connected...');
    microgear.setname("mygear");
    setInterval(function() {
        microgear.chat('mygear', 'Hello world.');
    },1000);
});

microgear.on('message', function(topic,body) {
    console.log('incoming : '+topic+' : '+body);
});

microgear.on('closed', function() {
    console.log('Closed...');
});

microgear.connect(APPID);

