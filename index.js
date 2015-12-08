/**
 * NetPIE microgear Library for Node.js
 * http://netpie.io
 */

module.exports.create = create;

/**
 * General API Endpoint
 * @type {String}
 */

const GEARAPIADDRESS = 'ga.netpie.io';
const GEARAPIPORT = '8080';

/**
 * Microgear API version
 * @type {String}
 */
const MGREV = 'NJS1a';

/**
 * Constants
 */
const TOKENCACHEFILENAME = 'microgear.cache';
const MINTOKDELAYTIME = 100;
const MAXTOKDELAYTIME = 30000;
const DEBUGMODE = false;
const RETRYCONNECTIONINTERVAL = 5000;

var self = null;
var events = require('events');
var http = require('http');
var mqtt = require('mqtt');
var OAuth = require('oauth');
var crypto = require('crypto');
var oauth;
var topModule = module;
while(topModule.parent) {
  topModule = topModule.parent;
}
var appdir = require('path').dirname(topModule.filename);   

/**
 * Microgear constructor
 * @param  {String} gearkey    gearkey
 * @param  {String} gearsecret Gear secret
 * @return {[type]}            [description]
 */
var microgear = function(gearkey,gearsecret,gearalias) {
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
}
microgear.prototype = new events.EventEmitter;


function jsonparse(jsontext) {
    var jsonobj;
    try {
        jsonobj = JSON.parse(jsontext);
    }
    catch(e) {
        return null;
    }
    return jsonobj;
}

function serialize(input) {
    return JSON.stringify({_:input});
}

function deserialize(input) {
    return jsonparse(input)._;
}

/** @type {Object} Token Cache object */
var cache = {
    getItem :   function(key) {
                    var fs = require('fs');
                    try {
                        var val = fs.readFileSync(appdir+'/'+key);
                        if (typeof(val)!='undefined') return deserialize(val);
                        else return null;
                    }
                    catch(e) {
                        return null;
                    }
                },
    setItem :   function(key,val) {
                    var fs = require('fs');
                    fs.writeFileSync(appdir+'/'+key,serialize(val));
                }
}

/**
 * Cache getter
 * @param  {string} key key name
 * @return {String}     value
 */
function getGearCacheValue(key) {
    var c = cache.getItem(TOKENCACHEFILENAME);
    if (c == null) return null;
    else return c[key];
}

/**
 * Cache setter
 * @param {String} key   key name
 * @param {String} value value
 */
function setGearCacheValue(key,value) {
    var c = cache.getItem(TOKENCACHEFILENAME);
    if (c == null) c = {};
    c[key] = value;
    cache.setItem(TOKENCACHEFILENAME,c);
}

/**
 * Clear value of cache key
 * @param  {String} key key name
 * @return {String}     value
 */
function clearGearCache(key) {
    var c = cache.getItem(TOKENCACHEFILENAME);
    if (c == null) return;
    else {
        if (key) {
            c[key] = null;
            cache.setItem(TOKENCACHEFILENAME,c);
        }
        else {
            cache.setItem(TOKENCACHEFILENAME,null);
        }
    }
}

/**
 * Create MicroGear client
 * @param  {object} param client parameter
 * @return {object}       microgear client
 */
function create(param) {
    var mode;
    var gkey = param.key?param.key:param.gearkey?param.gearkey:"";
    var gsecret = param.secret?param.secret:param.gearsecret?param.gearsecret:"";
    var galias = param.alias?param.alias:param.gearalias?param.gearalias:"";

    if (!param) return;
    var scope = param.scope;

    if (gkey && gsecret) {
        var mg = new microgear(gkey, gsecret, galias);

        mg.scope = param.scope;

        self = mg;
        return mg;
    }
    else {  
        return null;
    }
}

/**
 * Helper function to obtain access token
 * @param  {Function} callback Callback
 */
microgear.prototype.gettoken = function(callback) {
    var that = this;
    if (this.debugmode) console.log('Check stored token');

    var cachekey = getGearCacheValue('key');
    if (cachekey && cachekey != this.gearkey) {
        microgear.prototype.resettoken();
        clearGearCache();
    }
    setGearCacheValue('key',this.gearkey);
    if (!this.accesstoken)
        this.accesstoken = getGearCacheValue('accesstoken');
    if (this.accesstoken) {
        var endpoint = require('url').parse(this.accesstoken.endpoint);

        this.gearexaddress = endpoint.hostname;
        this.gearexport = endpoint.port;
        if (typeof(callback)=='function') callback(3);
    }
    else {
        if (!this.requesttoken)
            this.requesttoken = getGearCacheValue('requesttoken');
        if (this.requesttoken) {
            /* send requesttoken to obtain accesstoken*/

            if (self.debugmode) {
                console.log('already has request token');
                console.dir(this.requesttoken);
                console.log("Requesting an access token.");
            }

            var oauth = new OAuth.OAuth(
                null,
                'http://'+GEARAPIADDRESS+':'+GEARAPIPORT+'/api/atoken',
                this.gearkey,
                this.gearsecret,
                '1.0',
                '',
                'HMAC-SHA1'
            );

            oauth.getOAuthAccessToken(this.requesttoken.token, this.requesttoken.secret,this.requesttoken.verifier, function (err, oauth_token, oauth_token_secret, results){
                if (!err) {
                    var hkey = oauth_token_secret+'&'+that.gearsecret;
                    var revokecode = crypto.createHmac('sha1', hkey).update(oauth_token).digest('base64').replace(/\//g,'_');

                    that.accesstoken = {token:oauth_token, secret: oauth_token_secret, appkey: results.appkey, endpoint: results.endpoint, revokecode: revokecode};
                    if (results.flag != 'S') {
                        setGearCacheValue('accesstoken',that.accesstoken);
                        setGearCacheValue('requesttoken',null);
                    }
                    else {
                        clearGearCache();
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
                                    microgear.prototype.emit('rejected','Request token rejected');
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

            var oauth = new OAuth.OAuth(
                'http://'+GEARAPIADDRESS+':'+GEARAPIPORT+'/api/rtoken',
                null,
                this.gearkey,
                this.gearsecret,
                '1.0',
                'scope='+this.scope+'&appid='+this.appid+'&mgrev='+MGREV+'&verifier='+verifier,
                'HMAC-SHA1'
            );

            oauth.getOAuthRequestToken({},function(err, oauth_token, oauth_token_secret, results ){
                if (!err) {
                    that.requesttoken = {token: oauth_token, secret: oauth_token_secret, verifier: verifier};
                    setGearCacheValue('requesttoken',that.requesttoken);
                    if (typeof(callback)=='function') callback(1);
                }
                else if (typeof(callback)=='function') callback(0);
            });
        }
    }
}

/**
 * Get instance of the microgear
 * @return {Object} microgear instance
 */
microgear.prototype.getinstance = function() {
    return this;
}

var toktime = MINTOKDELAYTIME;
function initiateconnection(done) {
    self.gettoken(function(state) {
        switch (state) {
            case 0 :    /* No token issue */
                        console.log('Error: request token is not issued, please check your key and secret.');
                        throw new Error('Error: request token is not issued, please check your key and secret.');
                        return;
            case 1 :    /* Request token issued or prepare to request request token again */
                        setTimeout(function() {
                            if (toktime < MAXTOKDELAYTIME) toktime *= 2;
                            initiateconnection(done);
                        },toktime);
                        return;
            case 2 :    /* Access token issued */
                        initiateconnection(done);
                        toktime = 1;
                        return;
            case 3 :    /* Has access token ready for connecting broker */
                        toktime = 1;
                        self.brokerconnect(function() {
                            if (typeof(done)=='function') done();
                        });
                        return;
        }
    });
}

process.on('uncaughtException', function(err) {
    microgear.prototype.emit(err);
});

/**
 * Initiate NetPIE connection
 * @param  {String}   appid appid
 * @param  {Function} done  Callback
 */
microgear.prototype.connect = function(appid,arg1,arg2) {
    var done = null;
    this.appid = appid;

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

    initiateconnection(done);
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
 * Authenticate with broker using a current access token
 * @param  {Function} callback Callback
 */
microgear.prototype.brokerconnect = function(callback) {
    var that = this;
    var hkey = this.accesstoken.secret+'&'+this.gearsecret;
    var mqttuser = this.gearkey+'%'+Math.floor(Date.now()/1000);
    var mqttpassword = crypto.createHmac('sha1', hkey).update(this.accesstoken.token+'%'+mqttuser).digest('base64');
    var mqttclientid = this.accesstoken.token;

    if (this.debugmode) {
        console.log("mqttuser     : "+mqttuser);
        console.log("mqttpassword : "+mqttpassword);
    }

    this.clientid = mqttclientid;

    this.client = mqtt.connect(
        'mqtt://'+this.gearexaddress,
        {   port: this.gearexport,
            username: mqttuser,
            password: mqttpassword,
            clientId: mqttclientid,
            protocolVersion: 3,
            keepalive: 10,
            will: this.options?this.options.will:{}
        }
    );

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
                microgear.prototype.emit('info','invalid token, requesting a new one');

                clearGearCache();
                that.requesttoken = null;
                that.accesstoken = null;

                self.client.end();
                setTimeout(function() {
                    initiateconnection(function() {
                        if (self.debugmode) console.log('auto reconnect');
                    });
                }, RETRYCONNECTIONINTERVAL);
                break;
            case 'Error: Connection refused: Not authorized' : // code 5
                microgear.prototype.emit('warning','microgear unauthorized');

                self.client.end();
                setTimeout(function() {
                    initiateconnection(function() {
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
                        microgear.prototype.emit('present',{event:'present',gearkey:message.toString()});
                        break;
                case 'absent' : 
                        microgear.prototype.emit('absent',{event:'abesent',gearkey:message.toString()});
                        break;
            }
        }
        else {
            microgear.prototype.emit('message',topic, message);
        }
    });

    this.client.on('close', function() {
        if (self.debugmode) console.log('client close');
        this.emit('disconnected');
    });

    this.client.on('connect', function(pack) {

        for(var i=0; i<self.subscriptions.length; i++) {
            if (self.debugmode) console.log('auto subscribe '+self.subscriptions[i]);
            self.client.subscribe(self.subscriptions[i]);
        }

        if (microgear.prototype.listeners('present')) {
            self.client.subscribe('/'+self.appid+'/&present');
        }
        if (microgear.prototype.listeners('absent')) {
            self.client.subscribe('/'+self.appid+'/&absent');
        }

        microgear.prototype.emit('connected');
    });

    this.client.on('end', function() {
        microgear.prototype.emit('pieclosed');
        microgear.prototype.emit('closed');
    });
}

/**
 * Subscribe topic
 * @param  {String}   topic    Topic string of the form /my/topic
 * @param  {Function} callback Callback
 */
microgear.prototype.subscribe = function(topic,callback) {
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
                    if (granted && granted[0] && granted[0].qos==0||granted[0].qos==1||granted[0].qos==2) {
                        callback(1);
                    }
                    else callback(0);
                }
            }
        });
    }
    else
        microgear.prototype.emit('error','microgear is disconnected, cannot subscribe.');
}

/**
 * Unscribe topic
 * @param  {String}   topic    Topic string
 * @param  {Function} callback Callback
 */
microgear.prototype.unsubscribe = function(topic,callback) {
    if (this.debugmode) {
        console.log(this.subscriptions.indexOf('/'+this.appid+topic));
        console.log(this.subscriptions);
    }

    this.client.unsubscribe('/'+this.appid+topic, function() {
        self.subscriptions.splice(self.subscriptions.indexOf('/'+this.appid+topic));
        if (this.debugmode)
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
    if (this.gearname) this.unsubscribe('/gearname/'+this.gearname);
    this.subscribe('/gearname/'+gearname, function() {
        this.gearname = gearname;
        if (typeof(callback) == 'function') callback();
    });
}

/**
 * Set alias on this instance
 * @param  {String}   gearname Gear name
 * @param  {Function} callback Callback
 */
microgear.prototype.setalias = function (newalias, callback) {
    this.publish('/@setalias/'+newalias, "", {}, function() {
       this.gearalias = newalias;
       if (typeof(callback) == 'function') callback();
    });
}


/**
 * Reset name of this instance
 * @param  {Function} callback Callback
 */
microgear.prototype.unsetname = function (callback) {
    if (this.gearname != null) {
        this.unsubscribe('/gearname/'+this.gearname, function() {
            this.gearname = null;
            if (typeof(callback) == 'function') callback();
        });
    }
}

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
        microgear.prototype.emit('error','microgear is disconnected, cannot publish.');
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
 * handle a new event listening
 */
microgear.prototype.on('newListener', function(event,listener) {
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

/**
 * call api request on stream data, this method is available only for api tester at the moment
 * @param  {String}   stream The name of stream
 * @param  {String}   filter  Query condition
 */
microgear.prototype.readstream = function(stream,filter) {
    this.publish('/@readstream/'+stream,'{"filter":"'+filter+'"}');     
}

/**
 * call api request to record stream data, this method is available only for api tester at the moment
 * @param  {String}   stream The name of stream
 * @param  {String}   data  Stream data
 */
microgear.prototype.writestream = function(stream,data) {
    this.publish('/@writestream/'+stream,'{"data":'+data+'}');      
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
    this.accesstoken = getGearCacheValue('accesstoken');
    if (this.accesstoken) {
        var revokecode = this.accesstoken.revokecode.replace(/\//g,'_');
        var opt = {
            host: GEARAPIADDRESS,
            path: '/api/revoke/'+this.accesstoken.token+'/'+revokecode,
            port: GEARAPIPORT,
            method: 'GET'
        };
        var rq = http.request(opt, function(res){
            var result = '';
            res.on('data', function(chunk){
                result += chunk;
            });             
            res.on('end', function(){
                if (result !== 'FAILED') {
                    clearGearCache();
                    if (typeof(callback)=='function') callback(null);
                }
                else if (typeof(callback)=='function') callback(result);
            });
        });
        rq.on('error',function(e) {
            microgear.prototype.emit('error','Reset token error : '+e.message);
            if(typeof(callback)=='function') callback(e.message);
        });
        rq.end();
    }
    else {
        if (typeof(callback)=='function') callback(null);
    }
}
