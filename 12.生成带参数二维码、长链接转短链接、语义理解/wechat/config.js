'use strict'

var path  = require('path');
var util = require('./libs/util.js'); 

var wechat_file = path.join(__dirname, './config/wechat.txt');

// 配置信息
var config = {
	wechat: {
		// AppID: 'wx54eee413ca4627ab',
		AppID: 'wx65d88486a900b45f',
		// AppSecret: 'c7921ad1e047fc66aaa155a44aeebbdc',
		AppSecret: 'd8aa231e828670c05643a4fa0121a9d9',
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

module.exports = config;