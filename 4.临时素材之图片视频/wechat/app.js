'use strict'

var Koa = require('koa');
var path  = require('path');
var wechat = require('./wechat/g.js');
var util = require('./libs/util.js'); 
var config = require('./config.js');
var weixin = require('./weixin.js');

var wechat_file = path.join(__dirname, './config/wechat.txt');

const app = new Koa();

app.use(wechat(config.wechat, weixin.reply));

app.listen(3000);
console.log('成功启动服务,端口3000');