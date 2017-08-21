'use strict'

var Koa = require('koa');
var path  = require('path');
var wechat = require('./wechat/g.js');
var util = require('./libs/util.js'); 

var wechat_file = path.join(__dirname, './config/wechat.txt');

// 配置信息
var config = {
	wechat: {
		AppID: 'wx54eee413ca4627ab',
		AppSecret: '54c3fced624eb9dc57b5696aa0999583',
		token: 'linlinqweasdzxc',
		getAccessToken: function() {
			return util.readFileAsync(wechat_file);
		},
		saveAccessToken: function(data) {
			data = JSON.stringify(data);
			return util.writeFileAsync(wechat_file, data);
		}
	}
}

const app = new Koa();

app.use(wechat(config.wechat));

app.listen(3000);
console.log('成功启动服务,端口3000');