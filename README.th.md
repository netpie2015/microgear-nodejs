# microgear-nodejs

microgear-nodejs คือ client library ภาษา Node.js ที่ทำหน้าที่เป็นตัวกลางในการเชื่อมโยง application code หรือ hardware เข้ากับบริการของ netpie platform เพื่อการพัฒนา IOT application รายละเอียดเกี่ยวกับ netpie platform สามารถศึกษาได้จาก https://netpie.io

## Port ที่มีการใช

หากพบปัญหาการใช้งาน กรุณาตรวจสอบว่า port ต่อไปนี้ได้รับอนุญาตให้เข้าถึงจาก n
- Non-TLS mode : 8080 and 1883 (microgear-nodejs ใช้ mode นี้เป็นค่าเริ่มต้น)
- TLS mode : 8081 and 8883

## การติดตั้ง

```
npm install microgear
```

ตัวอย่างการเรียกใช้
```js
var MicroGear = require('microgear');

const APPID  = <APPID>;
const KEY    = <KEY>;
const SECRET = <SECRET>;

var microgear = MicroGear.create({
    key : KEY,
    secret : SECRET
});

microgear.on('connected', function() {
    console.log('Connected...');
    microgear.setAlias("mygear");
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
  * *key* `string` - เป็น key สำหรับ gear ที่จะรัน ใช้ในการอ้างอิงตัวตนของ gear
  * *secret* `string` - เป็น secret ของ key ซึ่งจะใช้ประกอบในกระบวนการยืนยันตัวตน
  * *alias* `string` - เป็นการตั้งชื่อเรียก จะใส่ที่นี่หรือ setAlias() ทีหลังก็ได้

```js
var microgear = MicroGear.create({
    gearkey : "sXfqDcXHzbFXiLk",
    gearsecret : "DNonzg2ivwS8ceksykGntrfQjxbL98",
    alias : "mygear"
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
**void microgear.setAlias (*gearalias*)**
microgear สามารถตั้งนามแฝงของตัวเองได้ ซึ่งสามารถใช้เป็นชื่อให้คนอื่นเรียกในการใช้ฟังก์ชั่น chat() และชื่อที่ตั้งในโค้ด จะไปปรากฎบนหน้าจัดการ key บนเว็บ netpie.io อย่างอัตโนมัติ

**arguments**
* *gearalias* `string` - ชื่อของ microgear นี้   

```js
microgear.setAlias("plant");
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
**void microgear.publish (*topic*, *message*, [retained])**
ในการณีที่ต้องการส่งข้อความแบบไม่เจาะจงผู้รับ สามารถใช้ฟังชั่น publish ไปยัง topic ที่กำหนดได้ ซึ่งจะมีแต่ microgear ที่ subscribe topoic นี้เท่านั้น ที่จะได้รับข้อความ

**arguments**
* *topic* `string` - ชื่อของ topic ที่ต้องการจะส่งข้อความไปถึง
* *message* `string` - ข้อความ
* *retained* `boolean` - ให้ retain ข้อความไว้หรือไม่ default เป็น `false`

```js
microgear.publish("/outdoor/temp","28.5");
microgear.publish("/outdoor/humid","56",true);
```
---
**void microgear.subscribe (*topic*)**
microgear อาจจะมีความสนใจใน topic ใดเป็นการเฉพาะ เราสามารถใช้ฟังก์ชั่น subscribe() ในการบอกรับ message ของ topic นั้นได้ และหาก topic นั้นเคยมีการ retain ข้อความไว้ microgear จะได้รับข้อความนั้นทุกครั้งที่ subscribe topic

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
**void microgear.writeFeed (*feedid*, *datajson* [, *apikey*])**
เขียนข้อมูลลง feed storage

**arguments**
* *feedid* `string` - ชื่อของ feed ที่ต้องการจะเขียนข้อมูล 
* *datajson* `string` - ข้อมูลที่จะบันทึก ในรูปแบบ json 
* *apikey* `string` - apikey สำหรับตรวจสอบสิทธิ์ หากไม่กำหนด จะใช้ default apikey ของ feed ที่ให้สิทธิ์ไว้กับ AppID

```js
microgear.writeFeed("homesensor",{temp:25.7,humid:62.8,light:8.5});
```
---

**void microgear.setCachePath (path)**
โดยปกติแล้ว microgear จะเก็บไฟล์ token cache ใน directory เดียวกับ application โดยตั้งชื่อไฟล์ชื่อไฟล์ในรูปแบบ  microgear-<KEY>.cache เราสามารถกำหนด path ของ token cache file​ ใหม่ด้วยฟังก์ชั่น setCachePath() ซึ่งอาจจำเป็ฯต้องใช้ หากในไฟล์ Node.js application เดียวกัน มีการสร้าง microgear มากกว่าหนึ่งตัว

**arguments**
* *path* `string` - path ของไฟล์ cache

```js
microgear.setCachePath('microgear-g1.cache');
```

---

**void microgear.resetToken (callback)**
ส่งคำสั่ง revoke token ไปยัง netpie และลบ token ออกจาก cache ส่งผลให้ microgear ต้องขอ token ใหม่ในการเชื่อมต่อครั้งต่อไป

**arguments**
* *callback* `function` - callback function ที่จะถูกเรียกเมื่อการ reset token เสร็จสิ้น

```js
microgear.resetToken(function(result){
});
```

เนื่องจาก resettoken() เป็น asynchronous function หากต้องการ connect หลังจาก resettoken ต้องเขียนโค้ดในลักษณะนี้
```js
microgear.resetToken(function(result){
    microgear.connect(APPID);
});
```

---

**void microgear.useTLS (tlsmode)**
เลือกใช้หรือไม่ใช้การเข้ารหัสแบบ  TLS. หากกไม่ได้เซตอะไร โดยค่าเริ่มต้น microgear-nodejs จะไม่ใช้ TLS

**arguments**
* *tlsmode* `boolean` - `true คือใช้ TLS`

```js
microgear.useTLS(false);
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

**Event: 'error'**
เป็น event ที่เกิดมี error ขึ้นภายใน microgear
```
microgear.on("error", function(err) {
	console.log("Error: "+err);
});
```

**Event: 'warning'**
เป็น event ที่เกิดมีเหตุการณ์บางอย่างเกิดขึ้นขึ้น และมีการเตือนให้ทราบ
```
microgear.on("warning", function(msg) {
	console.log("Connection rejected: "+msg);
});
```

**Event: 'info'**
เป็น event ที่เกิดมีเหตุการณ์บางอย่างเกิดขึ้นขึ้นภายใน microgear
```
microgear.on("info", function(msg) {
	console.log("Connection rejected: "+msg);
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
