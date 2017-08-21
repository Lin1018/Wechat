'use strict'

var path  = require('path');
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

module.exports = config;