'use strict'

const sha1 = require('sha1');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
	accessToken: prefix + 'token?grant_type=client_credential'
}

// 判断access_token(票据)是否过期
function Wechat(options) {
	var that = this;
	this.AppID = options.AppID;
	this.AppSecret = options.AppSecret;
	// 获取票据
	this.getAccessToken = options.getAccessToken;
	// 存储票据
	this.saveAccessToken = options.saveAccessToken;

	this.getAccessToken()
		.then(function(data) {
			try {  // 票据内容JSON化
				data = JSON.parse(data);
			}
			catch(e) {
				// 文件异常或非法,则更新票据
				return that.updateAccessToken();
			}
			// 合法性检查
			if (that.isValidAccessToken(data)) {
				// 返回票据
				return Promise.resolve(data);
			} else {
				// 非法或过期,更新票据
				return that.updateAccessToken();
			}

		})  
		.then (function(data) {
			that.access_token = data.access_token;
			that.expires_in = data.expires_in;  // 过期字段

			that.saveAccessToken(data);  // 存储票据
		})
}
// 原型中加入合法性检查方法
Wechat.prototype.isValidAccessToken = function(data) {
	if (!data || !data.access_token || !data.expires_in) {
		return false;    // 不合法返回false
	}
	// 获取票据
	var access_token = data.access_token;
	// 获取过期时间
	var expires_in = data.expires_in;
	// 获取当前时间
	var now = (new Date().getTime());

	if (now < expires_in){
		return true;
	} else {
		return false;
	}
}

// 跟新票据的方法
Wechat.prototype.updateAccessToken = function() {
	var AppID = this.AppID;
	var AppSecret = this.AppSecret;
	var url	= api.accessToken + '&appid=' + AppID + '&secret=' + AppSecret;

	return new Promise(function(resolve, reject) {
		request({ url:url, json: true}).then(function(response) {
			var data = response.body;
			var now = (new Date().getTime());
			// 更新数据时,有效时间缩短20秒(提前20秒更新)
			var expires_in = now + (data.expires_in - 20) * 1000;
			data.expires_in = expires_in;	

			resolve(data);
		});
	});

}

module.exports = function(options) {
	// 实例化构造函数
	var wechat = new Wechat(options);  

	return function* (next) {
		// 验证
		var token = options.token;
		var signature = this.query.signature;
		var nonce = this.query.nonce;
		var timestamp = this.query.timestamp;
		var echostr = this.query.echostr;
		var str = [token, timestamp, nonce].sort().join('');
		var sha = sha1(str);
		//判断请求是否是从微信服务器发送过来的
		if ( sha === signature ) {
			this.body = echostr + '';
		} else {
			this.body = 'wrong';
		}
	}	
}