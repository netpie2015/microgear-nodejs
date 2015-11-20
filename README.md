# microgear-nodejs

microgear-nodejs คือ client library ภาษา Node.js ที่ทำหน้าที่เป็นตัวกลางในการเชื่อมโยง application code หรือ hardware เข้ากับบริการของ netpie platform เพื่อการพัฒนา IOT application รายละเอียดเกี่ยวกับ netpie platform สามารถศึกษาได้จาก http://netpie.io

## การติดตั้ง

```
npm install microgear
```

ตัวอย่างการเรียกใช้
```js
var MicroGear = require('microgear');

const APPKEY    = <APPKEY>;
const APPSECRET = <APPSECRET>;
const APPID     = <APPID>;

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
```
## การใช้งาน library
**microgear create (config)**

**arguments**
* *config* เป็น json object ที่ที่มี attribute ดังนี้
  * *gearkey* `string` - เป็น key สำหรับ gear ที่จะรัน ใช้ในการอ้างอิงตัวตนของ gear
  * *gearsecret* `string` - เป็น secret ของ key ซึ่งจะใช้ประกอบในกระบวนการยืนยันตัวตน
  * *scope* `string` - เป็นการระบุขอบเขตของสิทธิ์ที่ต้องการ

**scope**
เป็นการต่อกันของ string ในรูปแบบต่อไปนี้ คั่นด้วยเครื่องหมาย comma
  * [r][w]:&lt;/topic/path&gt; - r และ w คือสิทธิ์ในการ publish ละ subscribe topic ดังที่ระบุ เช่น rw:/outdoor/temp
  *  name:&lt;gearname&gt; - คือสิทธิ์ในการตั้งชื่อตัวเองว่า &lt;gearname&gt;
  *  chat:&lt;gearname&gt; - คือสิทธ์ในการ chat กับ &lt;gearname&gt;
ในขั้นตอนของการสร้าง key บนเว็บ netpie.io นักพัฒนาสามารถกำหนดสิทธิ์ขั้นพื้นฐานให้แต่ละ key ได้อยู่แล้ว หากการ create microgear อยู่ภายใต้ขอบเขตของสิทธิ์ที่มี token จะถูกจ่ายอัตโนมัติ และ microgear จะสามารถเชื่อมต่อ netpie platform ได้ทันที แต่หาก scope ที่ร้องขอนั้นมากเกินกว่าสิทธิ์ที่กำหนดไว้ นักพัฒนาจะได้รับ notification ให้พิจารณาอนุมัติ microgear ที่เข้ามาขอเชื่อมต่อ ข้อควรระวัง หาก microgear มีการกระทำการเกินกว่าสิทธิ์ที่ได้รับไป เช่น พยายามจะ publish ไปยัง topic ที่ตัวเองไม่มีสิทธิ์ netpie จะตัดการเชื่อมต่อของ microgear โดยอัตโนมัติ ในกรณีที่ใช้ APPKEY เป็น gearkey เราสามารถละเว้น attribute นี้ได้ เพราะ APPKEY จะได้สิทธิ์ทุกอย่างในฐานะของเจ้าของ app โดย default อยู่แล้ว 

```js
var microgear = MicroGear.create({
    gearkey : "sXfqDcXHzbFXiLk",
    gearsecret : "DNonzg2ivwS8ceksykGntrfQjxbL98",
    scope : "r:/outdoor/temp,w:/outdoor/valve,name:logger,chat:plant"
});
```
---
## microgear
**void microgear.connect (*appid*, *callback*)**

**arguments**
* *appid* `string` - คือกลุ่มของ application ที่ microgear จะทำการเชื่อมต่อ 
```js
microgear.connect("happyfarm");
```
---
**void microgear.setname (*gearname*)**
microgear สามารถตั้งชื่อตัวเองได้ ซึ่งสามารถใช้เป็นชื่อเรียกในการใช้ฟังก์ชั่น chat()

**arguments**
* *gearname* `string` - ชื่อของ microgear นี้   

```js
microgear.setname("plant");
```
---
**void microgear.chat (*gearname*, *message*)**

**arguments**
* *gearname* `string` - ชื่อของ microgear ที่ต้องการจะส่งข้อความไปถึง 
* *message* `string` - ข้อความ

```js
microgear.chat("valve","I need water");
```
---
**void microgear.publish (*topic*, *message*)**
ในการณีที่ต้องการส่งข้อความแบบไม่เจาะจงผู้รับ สามารถใช้ฟังชั่น publish ไปยัง topic ที่กำหนดได้ ซึ่งจะมีแต่ microgear ที่ subscribe topoic นี้เท่านั้น ที่จะได้รับข้อความ

**arguments**
* *topic* `string` - ชื่อของ topic ที่ต้องการจะส่งข้อความไปถึง 
* *message* `string` - ข้อความ

```js
microgear.publish("/outdoor/temp","28.5");
```
---
**void microgear.subscribe (*topic*)**
microgear อาจจะมีความสนใจใน topic ใดเป็นการเฉพาะ เราสามารถใช้ฟังก์ชั่น subscribe() ในการบอกรับ message ของ topic นั้นได้

**arguments**
* *topic* `string` - ชื่อของ topic ที่ต้องการจะส่งข้อความไปถึง 

```js
microgear.subscribe("/outdoor/temp");
```
---
**void microgear.unsubscribe (*topic*)**
ยกเลิกการ subscribe

**arguments**
* *topic* `string` - ชื่อของ topic ที่ต้องการจะส่งข้อความไปถึง 

```js
microgear.unsubscribe("/outdoor/temp");
```
---
**void microgear.resettoken (callback)**
ออนไลน์ส่งคำสั่ง revoke token และลบ token ออกจาก cache ส่งผลให้ microgear ต้องขอ token ใหม่ในการเชื่อมต่อครั้งต่อไป

**arguments**
* *callback* `function` - callback function ที่จะถูกเรียกเมื่อการ reset token เสร็จสิ้น

```js
microgear.resettoken(function(result){
});
```

เนื่องจาก resettoken() เป็น asynchronous function หากต้องการ connect หลังจาก resettoken ต้องเขียนโค้ดในลักษณะนี้
```js
microgear.resettoken(function(result){
    microgear.connect(APPID);
});
```


---
## Events
application ที่รันบน microgear จะมีการทำงานในแบบ event driven คือเป็นการทำงานตอบสนองต่อ event ต่างๆ ด้วยการเขียน callback function ขึ้นมารองรับในลักษณะนี้

**void microgear.on (*event*, *callback*)**

**arguments**
* *event* `string` - ชื่อ event
* *callback* `function` - callback function

netpie platform เวอร์ชั่นปัจจุบัน มี event ดังต่อไปนี้

**Event: 'connected'**
เกืดขึ้นเมื่อ microgear library เชื่อมต่อกับ platform สำเร็จ
```
microgear.on("connected", function() {
	console.log("connected");
});
```

**Event: 'closed'**
เกืดขึ้นเมื่อ microgear library ตัดการเชื่อมต่อกับ platform
```
microgear.on("closed", function() {
	console.log("closed");
});
```

**Event: 'rejected'**
เป็น event ที่เกิดเมื่อ microgear เชื่อมต่อไม่สำเร็จ เนื่องจาก token ถูกปฏิเสธ อาจเป็นเพราะ token ถูก revoke หรือ disable
```
microgear.on("rejected", function(info) {
	console.log("Connection rejected: "+info);
});
```

**Event: 'error'**
เป็น event ที่เกิดมี error ขึ้นภายใน microgear
```
microgear.on("error", function(err) {
	console.log("Error: "+err);
});
```

**Event: 'message'**
เมื่อมี message เข้ามา จะเกิด event นี้ขึ้น พร้อมกับส่งผ่านข้อมูลเกี่ยวกับ message นั้นมาทาง argument ของ callback function
```
microgear.on("message", function(topic,msg) {
	console.log("Incoming message: "+mesage);
});
```

**Event: 'present'**
event นี้จะเกิดขึ้นเมื่อมี microgear ใน appid เดียวกัน online เข้ามาเชื่อมต่อ netpie
```
microgear.on("present", function(event) {
	console.log("New friend found: "+event.gearkey);
});
```
**Event: 'absent'**
event นี้จะเกิดขึ้นเมื่อมี microgear ใน appid เดียวกัน offline หายไป
```
microgear.on("absent", function(event) {
	console.log("Friend lost: "+event.gearkey);
});
```
