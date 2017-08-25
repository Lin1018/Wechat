'use strict'

var Koa = require('koa');
var path  = require('path');
var wechat = require('./wechat/g.js');
var util = require('./libs/util.js'); 
var config = require('./config.js');
var reply = require('./wx/reply.js');

const app = new Koa();

app.use(wechat(config.wechat, reply.reply));

app.listen(3000);
console.log('成功启动服务,端口3000');