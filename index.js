/**
 * NetPIE microgear Library for Node.js
 * http://netpie.io
*/

module.exports.create = create;

/**
 * General API Endpoint
 */
const GEARAPIADDRESS = 'ga.netpie.io';
const GEARAPIPORT = '8080';
const GEARAPISECUREPORT = '8081';

const GBMQTTPORT = '1883';
const GBMQTTSPORT = '8883';
const GBWSPORT = '8083';
const GBWSSPORT = '8084';

/**
 * Microgear API version
 */
const MGREV = 'NJS1b';

/**
 * Constants
 */
const DEBUGMODE = false;
const MINTOKDELAYTIME = 100;
const MAXTOKDELAYTIME = 30000;
const RETRYCONNECTIONINTERVAL = 5000;

var GEARAUTH = GEARAPIADDRESS;
var OAuth = require('oauth');
var crypto = require('crypto');
var topModule = module;
while(topModule.parent) {
  topModule = topModule.parent;
}
var appdir = process.browser?'':require('path').dirname(topModule.filename);
const ps = {p:'online',a:'offline',n:'aliased',u:'unaliased'};

/**
 * Create MicroGear client
 * @param  {object} param client parameter
 * @return {object}       microgear client
 */
function create(param) {
    var events = require('events');
    var mqtt = require('mqtt');
    var httpclient = null;
    var oauth;

    var microgear = function(gearkey,gearsecret,gearalias) {
        this.securemode = true;
        this.debugmode = DEBUGMODE;
        this.gearkey = gearkey;
        this.gearsecret = gearsecret;
        this.gearalias = gearalias?gearalias.substring(0,16):null;
        this.appid = null;
        this.gearname = null;
        this.accesstoken = null;
        this.requesttoken = null;
        this.client = null;
        this.scope = '';
        this.gearexaddress = null;
        this.gearexport = null;
        this.subscriptions = [];
        this.options = {};
        this.toktime = MINTOKDELAYTIME;
        this.microgearcache = appdir+'/microgear-'+this.gearkey+'.cache';
    }

    microgear.prototype = new events.EventEmitter;

    microgear.prototype.cache = {
        getItem :   function(key) {
                        var fs = process.browser?require('localstorage-fs'):require('fs');
                        try {
                            var val = fs.readFileSync(key);
                            if (typeof(val)!='undefined') {
                                var jsonobj;
                                try {
                                    jsonobj = JSON.parse(val);
                                }
                                catch(e) {
                                    return null;
                                }
                                return jsonobj._;
                            }
                            else return null;
                        }
                        catch(e) {
                            return null;
                        }
                    },
        setItem :   function(key,val) {
                        var fs = process.browser?require('localstorage-fs'):require('fs');
                        fs.writeFileSync(key,JSON.stringify({_:val}));
                    }
    };

    /**
     * Override cache file path
     * @param  {string} path cache file path
     */
    microgear.prototype.setCachePath = function(path) {
        this.microgearcache = path;
    }

    /**
     * Override cache file path
     * @param  {string} path cache file path
     */
    microgear.prototype.useTLS = function(usetls) {
        this.securemode = usetls;
    }

    /**
     * Cache getter
     * @param  {string} key key name
     * @return {String}     value
     */
    microgear.prototype.getGearCacheValue = function(key) {
        var c = this.cache.getItem(this.microgearcache);
        if (c == null) return null;
        else return c[key];
    }

    /**
     * Cache setter
     * @param {String} key   key name
     * @param {String} value value
     */
    microgear.prototype.setGearCacheValue = function(key,value) {
        var c = this.cache.getItem(this.microgearcache);
        if (c == null) c = {};
        c[key] = value;
        this.cache.setItem(this.microgearcache,c);
    }

    /**
     * Clear cache
     * @param {String} key   key name
     */
    microgear.prototype.clearGearCache = function(key) {
        var c = this.cache.getItem(this.microgearcache);
        if (c == null) return;
        else {
            if (key) {
                c[key] = null;
                this.cache.setItem(this.microgearcache,c);
            }
            else {
                this.cache.setItem(this.microgearcache,null);
            }
        }
    }

    /**
     * Helper function to obtain access token
     * @param  {Function} callback Callback
     */
    microgear.prototype.gettoken = function(callback) {
        var self = this;

        if (this.securemode) httpclient = require('https');
        else httpclient = require('http');

        if (this.debugmode) console.log('Check stored token');

        var cachekey = this.getGearCacheValue('key');
        if (cachekey && cachekey != this.gearkey) {
            self.resettoken();
            self.clearGearCache();
        }
        this.setGearCacheValue('key',this.gearkey);
        if (!this.accesstoken)
            this.accesstoken = this.getGearCacheValue('accesstoken');
        if (this.accesstoken) {

            if (this.accesstoken.endpoint != "") {
                var endpoint = require('url').parse(this.accesstoken.endpoint);
                this.gearexaddress = endpoint.hostname;
                this.gearexport = endpoint.port;
                if (typeof(callback)=='function') callback(3);
            }
            else {
                var opt;
                if (this.securemode) {
                    opt = {
                        host: GEARAUTH,
                        path: '/api/endpoint/'+this.gearkey,
                        port: GEARAPISECUREPORT,
                        method: 'GET'
                    };
                }
                else {
                    opt = {
                        host: GEARAUTH,
                        path: '/api/endpoint/'+this.gearkey,
                        port: GEARAPIPORT,
                        method: 'GET'
                    };
                }
                var rq = httpclient.request(opt, function(res){
                    var buff = '';
                    res.on('data', function(chunk){
                        buff += chunk;
                    });
                    res.on('end', function(){
                        if (buff) {
                            self.accesstoken.endpoint = buff;
                            self.setGearCacheValue('accesstoken',self.accesstoken);
                            if (typeof(callback)=='function') callback(3);
                        }
                        if (typeof(callback)=='function') callback(2);
                    });
                });
                rq.on('error',function(e) {
                    if (typeof(callback)=='function') callback(2);
                });
                rq.end();
            }
        }
        else {
            if (!this.requesttoken)
                this.requesttoken = this.getGearCacheValue('requesttoken');
            if (this.requesttoken) {
                /* send requesttoken to obtain accesstoken*/

                if (self.debugmode) {
                    console.log('already has request token');
                    console.dir(this.requesttoken);
                    console.log("Requesting an access token.");
                }

                var oauthurl;
                if (this.securemode) oauthurl = 'https://'+GEARAUTH+':'+GEARAPISECUREPORT+'/api/atoken';
                else oauthurl = 'http://'+GEARAUTH+':'+GEARAPIPORT+'/api/atoken';

                var oauth = new OAuth.OAuth(
                    null,
                    oauthurl,
                    this.gearkey,
                    this.gearsecret,
                    '1.0',
                    '',
                    'HMAC-SHA1'
                );

                oauth.getOAuthAccessToken(this.requesttoken.token, this.requesttoken.secret,this.requesttoken.verifier, function (err, oauth_token, oauth_token_secret, results){
                    if (!err) {
                        var hkey = oauth_token_secret+'&'+self.gearsecret;
                        var revokecode = crypto.createHmac('sha1', hkey).update(oauth_token).digest('base64').replace(/\//g,'_');

                        self.accesstoken = {token:oauth_token, secret: oauth_token_secret, appkey: results.appkey, endpoint: results.endpoint, revokecode: revokecode};
                        if (results.flag != 'S') {
                            self.setGearCacheValue('accesstoken',self.accesstoken);
                            self.setGearCacheValue('requesttoken',null);
                        }
                        else {
                            self.clearGearCache();
                        }
                        if (typeof(callback)=='function') callback(2);
                    }
                    else {
                        switch (err.statusCode) {
                            case 401:   // not authorized yet
                                        if (typeof(callback)=='function') callback(1);
                                        break;
                            case 500:   // eg. 500 request token not found
                            default :
                                        self.emit('rejected','Request token rejected');
                                        if (typeof(callback)=='function') callback(1);
                                        break;
                        }
                    }
                });
            }
            else {
                if (self.debugmode) {
                    console.log("Requesting a request token.");
                }

                var verifier;
                if (this.gearalias) verifier = this.gearalias;
                else verifier = MGREV;

                if (!this.scope) this.scope = '';

                var oauthurl;
                if (this.securemode) oauthurl = 'https://'+GEARAUTH+':'+GEARAPISECUREPORT+'/api/rtoken';
                else oauthurl = 'http://'+GEARAUTH+':'+GEARAPIPORT+'/api/rtoken';

                var oauth = new OAuth.OAuth(
                    oauthurl,
                    null,
                    this.gearkey,
                    this.gearsecret,
                    '1.0',
                    'scope='+this.scope+'&appid='+this.appid+'&mgrev='+MGREV+'&verifier='+verifier,
                    'HMAC-SHA1'
                );

                oauth.getOAuthRequestToken({},function(err, oauth_token, oauth_token_secret, results ){
                    if (!err) {
                        self.requesttoken = {token: oauth_token, secret: oauth_token_secret, verifier: verifier};
                        self.setGearCacheValue('requesttoken',self.requesttoken);
                        if (typeof(callback)=='function') callback(1);
                    }
                    else if (typeof(callback)=='function') callback(0);
                });
            }
        }
    }

    /**
     * Authenticate with broker using a current access token
     * @param  {Function} callback Callback
     */
    microgear.prototype.brokerConnect = function(callback) {
        var self = this;

        var hkey = this.accesstoken.secret+'&'+this.gearsecret;
        var mqttuser = this.gearkey+'%'+Math.floor(Date.now()/1000);
        var mqttpassword = crypto.createHmac('sha1', hkey).update(this.accesstoken.token+'%'+mqttuser).digest('base64');
        var mqttclientid = this.accesstoken.token;

        if (this.debugmode) {
            console.log("mqttuser     : "+mqttuser);
            console.log("mqttpassword : "+mqttpassword);
        }

        this.clientid = mqttclientid;

        if (this.securemode) {
            this.client = mqtt.connect(
                (process.browser?'wss://':'mqtts://')+this.gearexaddress,
                {   port: process.browser?GBWSSPORT:GBMQTTSPORT,
                    username: mqttuser,
                    password: mqttpassword,
                    clientId: mqttclientid,
                    protocolVersion: 3,
                    keepalive: 10,
                    will: this.options?this.options.will:{}
                }
            );
        }
        else {
            this.client = mqtt.connect(
                (process.browser?'ws://':'mqtt://')+this.gearexaddress,
                {   port: process.browser?GBWSPORT:GBMQTTPORT,
                    username: mqttuser,
                    password: mqttpassword,
                    clientId: mqttclientid,
                    protocolVersion: 3,
                    keepalive: 10,
                    will: this.options?this.options.will:{}
                }
            );
        }

        if (this.client) {
            /* subscribe for control messages */
            this.client.subscribe('/&id/'+this.clientid+'/#');
            if (typeof(callback)=='function') callback(null);
        }
        else {
            if (typeof(callback)=='function') callback('error');
            return;
        }

        this.client.on('error', function(err) {
            switch (err.toString()) {
                case 'Error: Connection refused: Bad username or password' : // code 4
                    // token may be nolonger valid, try to request a new one
                    self.emit('info','invalid token, requesting a new one');

                    self.clearGearCache();
                    self.requesttoken = null;
                    self.accesstoken = null;

                    self.client.end();
                    setTimeout(function() {
                        self.initiateConnection(function() {
                            if (self.debugmode) console.log('auto reconnect');
                        });
                    }, RETRYCONNECTIONINTERVAL);
                    break;
                case 'Error: Connection refused: Not authorized' : // code 5
                    self.emit('warning','microgear unauthorized');

                    self.client.end();
                    setTimeout(function() {
                        self.initiateConnection(function() {
                            if (self.debugmode) console.log('auto reconnect');
                        });
                    }, RETRYCONNECTIONINTERVAL);
                    break;
            }

        });

        this.client.on('message', function (topic, message) {
            var plen = self.appid.length +1;
            var rtop = topic.substr(plen,topic.length-plen);

            if (rtop.substr(0,2)=='/&') {
                var p = (rtop.substr(1,rtop.length-1)+'/').indexOf('/');
                var ctop = rtop.substr(2,p);

                switch (ctop) {
                    case 'present' :
                    case 'absent'  :
                                var pm;
                                try {
                                    pm = JSON.parse(message.toString());
                                }
                                catch(e) {
                                    pm = message.toString();
                                }
                            self.emit(ctop, pm);
                            break;
                    case 'resetendpoint' :
                            if (self.accesstoken && self.accesstoken.endpoint) {
                                self.accesstoken.endpoint = "";
                                self.setGearCacheValue('accesstoken',self.accesstoken);
                                self.emit('info','endpoint reset');
                            }
                            break;
                }
            }
            else if (topic.substr(0,1)=='@') {
                switch (topic) {
                    case '@info' :  self.emit('info',message);
                                    break;
                    case '@error' : self.emit('error',message);
                                    break;
                }
            }
            else {
                self.emit('message',topic, message);
            }
        });

        this.client.on('close', function() {
            if (self.debugmode) console.log('client close');
            self.emit('disconnected');
        });

        this.client.on('connect', function(pack) {
            for(var i=0; i<self.subscriptions.length; i++) {
                if (self.debugmode) console.log('auto subscribe '+self.subscriptions[i]);
                self.client.subscribe(self.subscriptions[i]);
            }

            if (self.listeners('present')) {
                self.client.subscribe('/'+self.appid+'/&present');
            }
            if (self.listeners('absent')) {
                self.client.subscribe('/'+self.appid+'/&absent');
            }

            if (self.gearalias) {
                self.setalias(self.gearalias);
            }

            self.emit('connected');
        });

        this.client.on('end', function() {
            self.emit('pieclosed');
            self.emit('closed');
        });
    }

    /**
     * Initalize a connection to NETPIE
     * @param  {object} callback function
     */
    microgear.prototype.initiateConnection= function(done) {
        var self = this;

        this.gettoken(function(state) {
            switch (state) {
                case 0 :    // No token issue
                            self.emit('error','Request token is not issued, please check your key and secret');
                            return;
                case 1 :    // Request token issued or prepare to request request token again
                            setTimeout(function() {
                                if (self.toktime < MAXTOKDELAYTIME) self.toktime *= 2;
                                self.initiateConnection(done);
                            },self.toktime);
                            return;
                case 2 :    // Access token issued
                            self.initiateConnection(done);
                            self.toktime = 1;
                            return;
                case 3 :    // Has access token ready for connecting broker
                            self.toktime = 1;
                            self.brokerConnect(function() {
                                if (typeof(done)=='function') done();
                            });
                            return;
            }

        });
    }

    /**
     * Do NetPIE connection
     * @param  {String}   appid appid
     * @param  {Function} done  Callback
     */
    microgear.prototype.doConnect = function(arg1,arg2) {
        var done = null;
        if (typeof(arg1)=='function') done = arg1;
        else {
            if (typeof(arg1)=='object') {
                this.options = arg1;
                if (this.options && this.options.will && this.options.will.topic) {
                    this.options.will.topic = '/'+appid+this.options.will.topic;
                }
            }
            if (typeof(arg2)=='function') done = arg2;
        }
        this.initiateConnection(done);
    };

    /**
     * Initiate NetPIE connection
     * @param  {String}   appid appid
     * @param  {Function} done  Callback
     */
    microgear.prototype.connect = function(appid,arg1,arg2) {
        this.appid = appid;
        this.doConnect(arg1,arg2);
    }

    /*
     * Get instance of the microgear
     * @return {Object} microgear instance
     */
    microgear.prototype.getinstance = function() {
        return this;
    }

    /**
     * Close connection
     * @param  {Function} done Callback
     */
    microgear.prototype.disconnect = function(done) {
        this.client.end();
        this.emit('disconnected');
    }

    /**
     * Subscribe topic
     * @param  {String}   topic    Topic string of the form /my/topic
     * @param  {Function} callback Callback
     */
    microgear.prototype.subscribe = function(topic,callback) {
        var self = this;

        if (this.client.connected) {
            this.client.subscribe('/'+this.appid+topic, function(err,granted) {
                if (granted && granted[0]) {
                    if (self.subscriptions.indexOf('/'+self.appid+topic)) {
                        self.subscriptions.push('/'+self.appid+topic);
                    }
                }
                if (typeof(callback)=='function') {
                    if (err) callback(0);
                    else {
                        if (granted && granted[0] && (granted[0].qos==0 || granted[0].qos==1 || granted[0].qos==2)) {
                            callback(1);
                        }
                        else callback(0);
                    }
                }
            });
        }
        else {
            self.emit('error','microgear is disconnected, cannot subscribe.');
        }
    }

    /**
     * Unscribe topic
     * @param  {String}   topic    Topic string
     * @param  {Function} callback Callback
     */
    microgear.prototype.unsubscribe = function(topic,callback) {
        var self = this;

        if (this.debugmode) {
            console.log(this.subscriptions.indexOf('/'+this.appid+topic));
            console.log(this.subscriptions);
        }

        this.client.unsubscribe('/'+this.appid+topic, function() {
            self.subscriptions.splice(self.subscriptions.indexOf('/'+self.appid+topic));
            if (self.debugmode)
                console.log(self.subscriptions);
            if (typeof(callback) == 'function') callback();
        });
    }

    /**
     * Deprecated
     * Name this instance of microgear
     * @param  {String}   gearname Gear name
     * @param  {Function} callback Callback
     */
    microgear.prototype.setname = function (gearname, callback) {
        var self = this;

        if (this.gearname) this.unsubscribe('/gearname/'+this.gearname);
        this.subscribe('/gearname/'+gearname, function() {
            self.gearname = gearname;
            if (typeof(callback) == 'function') callback();
        });
    }

    /**
     * Set alias on this instance
     * @param  {String}   gearname Gear name
     * @param  {Function} callback Callback
     */
    microgear.prototype.setalias = function (newalias, callback) {
        var self = this;

        this.publish('/@setalias/'+newalias, "", {}, function() {
           self.gearalias = newalias;
           if (typeof(callback) == 'function') callback();
        });
    }


    /**
     * Reset name of this instance
     * @param  {Function} callback Callback
     */
    microgear.prototype.unsetname = function (callback) {
        var self = this;
        if (this.gearname != null) {
            this.unsubscribe('/gearname/'+this.gearname, function() {
                self.gearname = null;
                if (typeof(callback) == 'function') callback();
            });
        }
    }

    /**
     * Write data to feed
     * @param  {String} feedid FeedID
     * @param  {Object} datajson Data in a json format
     * @param  {String} apikey API Key for authorization (optional)
     */
    microgear.prototype.writefeed = function (feedid, datajson, apikey) {
        var cmd = '/@writefeed/'+feedid;
        if (apikey) cmd += '/'+apikey;
        if (typeof(datajson) == 'object') datajson = JSON.stringify(datajson);
        this.publish(cmd,datajson);
    };

    /**
     * Publish message
     * @param  {String}   topic    Topic string
     * @param  {String}   message  Message
     * @param  {Object} param Publish Parameters
     */
    microgear.prototype.publish = function(topic, message, param, callback) {
        var options;

        switch (typeof(param)) {
            case 'object'  : options = param;
                             break;
            case 'boolean' : options = {retain : param};
                             break;
            default        : options = {};
        }
        if (this.client.connected)
            this.client.publish('/'+this.appid+topic, message, options, callback);
        else
            this.emit('error','microgear is disconnected, cannot publish.');
    }

    /**
     * Send message to a microgear addressed by @gearname
     * @param  {String}   gearname The name of the gear to send message to
     * @param  {String}   message  Message
     * @param  {Function} callback
     */
    microgear.prototype.chat = function (gearname, message, options) {
        this.publish('/gearname/'+gearname, message, options);
    }

    /**
     * read data from a specific postbox. data will be pushed through the topic /@readpostbox/<box>
     * @param  {String}   box The name of the postbox
     */
    microgear.prototype.readpostbox = function(box) {
        this.publish('/@readpostbox/'+box);
    }

    /**
     * put data to a specific postbox
     * @param  {String}   box The name of the postbox
     * @param  {String}   data  the text data to be stored
     */
    microgear.prototype.writepostbox = function(box,data) {
        this.publish('/@writepostbox/'+box,data);
    }

    /**
     * Revoke and remove token from cache
     * @param  {Function} callback Callabck
     */
    microgear.prototype.resettoken = function(callback) {
        var httpclient;
        var self = this;

        if (this.securemode) httpclient = require('https');
        else httpclient = require('http');

        this.accesstoken = this.getGearCacheValue('accesstoken');
        if (this.accesstoken) {
            var opt;
            var revokecode = this.accesstoken.revokecode.replace(/\//g,'_');

            if (this.securemode) {
                opt = {
                    host: GEARAUTH,
                    path: '/api/revoke/'+this.accesstoken.token+'/'+revokecode,
                    port: GEARAPISECUREPORT,
                    method: 'GET'
                };
            }
            else {
                opt = {
                    host: GEARAUTH,
                    path: '/api/revoke/'+this.accesstoken.token+'/'+revokecode,
                    port: GEARAPIPORT,
                    method: 'GET'
                };
            }

            var rq = httpclient.request(opt, function(res){
                var result = '';
                res.on('data', function(chunk){
                    result += chunk;
                });
                res.on('end', function(){
                    if (result !== 'FAILED') {
                        self.clearGearCache();
                        if (typeof(callback)=='function') callback(null);
                    }
                    else if (typeof(callback)=='function') callback(result);
                });
            });
            rq.on('error',function(e) {
                self.emit('error','Reset token error : '+e.message);
                if(typeof(callback)=='function') callback(e.message);
            });
            rq.end();
        }
        else {
            if (typeof(callback)=='function') callback(null);
        }
    }

    /**
     * Set configuration value by key
     * @param  {String} key Key
     * @param  {String} value  Value
     */
    microgear.prototype.setconfig = function(key,value) {
        switch(key) {
            case 'GEARAUTH' :   GEARAUTH = value.toString();
                                break;
        }
    }

    /**
     * Get configuration value by key
     * @param  {String} key Key
     * @return {String} value assigned to the input key
     */
    microgear.prototype.getconfig = function(key) {
        switch(key) {
            case 'GEARAUTH' :   return GEARAUTH;
                                break;
        }
    }

    /**
     * Get connection status
     * @return {Boolean} true if connected
     */
    microgear.prototype.connected = function() {
        if (!this.client) return false;
        else return this.client.connected;
    }

    /**
     * Push message to the owner of this device
     */
    microgear.prototype.pushowner = function(msg) {
        this.publish('/@push/owner', msg, {}, function() {
        });
    }

    process.on('uncaughtException', function(err) {
        if (DEBUGMODE) {
            console.log(err.toString());
        }
    });

    microgear.prototype.secureConnect = microgear.prototype.secureconnect;
    microgear.prototype.setName = microgear.prototype.setname;
    microgear.prototype.unsetName = microgear.prototype.unsetname;
    microgear.prototype.writeFeed = microgear.prototype.writefeed;
    microgear.prototype.setAlias = microgear.prototype.setalias;
    microgear.prototype.resetToken = microgear.prototype.resettoken;
    microgear.prototype.setConfig = microgear.prototype.setconfig;
    microgear.prototype.getConfig = microgear.prototype.getconfig;
    microgear.prototype.pushOwner = microgear.prototype.pushowner;

    var gkey = param.key || param.gearkey || "";
    var gsecret = param.secret || param.gearsecret || "";
    var galias = param.alias || param.gearalias || "";

    if (!param) return;
    var scope = param.scope;

    if (gkey && gsecret) {
        var mg = new microgear(gkey, gsecret, galias);
        mg.scope = param.scope;
        mg.on('newListener', function(event,listener) {
            switch (event) {
                case 'present' :
                        if (this.client) {
                            if (this.client.connected) {
                                this.subscribe('/&present');
                            }
                        }
                        break;
                case 'absent' :
                        if (this.client) {
                            if (this.client.connected) {
                                this.subscribe('/&absent');
                            }
                        }
                        break;
            }
        });
        return mg;
    }
    else {
        return null;
    }
}
