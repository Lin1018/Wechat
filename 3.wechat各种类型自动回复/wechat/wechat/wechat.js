'use strict'

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const util = require('./util.js')

const prefix = 'https://api.weixin.qq.com/cgi-bin/';
const api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	// 新增临时素材接口
	upload: prefix + 'media/upload?'
}

// 判断access_token(票据)是否过期
function Wechat(options) {
	var that = this;
	this.AppID = options.AppID;
	this.AppSecret = options.AppSecret;
	// 获取票据[]
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
/*
Wechat.prototype.uploadMaterial = function(type, filepath) {
	var that = this;
	var form = {
		media: fs.createReadStream(filepath);
	}

	var AppID = this.AppID;
	var AppSecret = this.AppSecret;

	return new Promise(function(resolve, reject) {
		that
			.fetchAccessToken()
			.then(function(data) {
				var url = api.upload + '&access_token=' + data.access_token + '&type=' +type;

				request({method: 'POST', url:url, formData: form, json:true}).then(function(response) {
					var _data = response.body;
					
					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Upload material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});
			});

	});
}
/*
Wechat.prototype.fetchAccessToken = function(data) {
	var that = this;

	if (this.access.token && this.expires_in) {
		if (this.isValidAccessToken(this)) {
			return Promise.resolve(this);
		}
	}

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

		return Promise.resolve(data);
	});
}*/

// reply通过call上下文已经改变，this指向g.js
Wechat.prototype.reply = function() {
	// 获取回复的内容
	var content = this.body;
	// 获取g.js的weixin属性的内容
	var message = this.weixin;
	// 控制台打印回复的内容
	console.log(content);
	// 通过util工具函数，生成需要的xml结构，进行回复
	var xml = util.tpl(content, message);

	// 回复的状态
	this.status = 200;
	// 回复的类型
	this.type = 'application/xml'
	// 回复的内容
	this.body = xml;
}

module.exports = Wechat;