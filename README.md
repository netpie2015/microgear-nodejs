# microgear-nodejs

microgear คือ Node.js client library ของ netpie platform ซึ่งจะช่วยให้การพัฒนา IOT hardware และ application เป็นเรื่องง่าย

การติดตั้ง

```
npm install microgear
```

ตัวอย่างการเขียนโปรแกรม
```js
var MicroGear = require('microgear');

/* สร้าง microgear object จาก appkey และ appsecret */
var microgear = MicroGear.create({
	gearkey : <APPKEY>,
	gearsecret : <APPSECRET>,
});

microgear.on('connected', function() {
	console.log('Connected...');
	microgear.setname("mygear");
	setInterval(function() {
		microgear.chat('mygear', 'Hello world.";
	},1000);
});

microgear.on('message', function(topic,body) {
	console.log('incoming : '+topic+' : '+body);
});

microgear.on('closed', function() {
	console.log('Closed...');
});

microgear.connect(<APPID>);

```


