'use strict'

const sha1 = require('sha1');
const getRawBody = require('raw-body');
const Wechat = require('./wechat.js');
const util = require('./util.js');

module.exports = function(options) {
	// 实例化构造函数
	var wechat = new Wechat(options);

	return function* (next) {
		var that = this;

		// 验证
		var token = options.token;
		var signature = this.query.signature;
		var nonce = this.query.nonce;
		var timestamp = this.query.timestamp;
		var echostr = this.query.echostr;
		var str = [token, timestamp, nonce].sort().join('');
		var sha = sha1(str);

		//判断请求是否是从微信服务器发送过来的数据
		if (this.method === 'GET') {
			if ( sha === signature ) {
				this.body = echostr + '';
			} else {
				this.body = 'wrong';
			}
		} else if (this.method === 'POST') {
			if ( sha !== signature ) {
				this.body = 'wrong';
				return false;
			}

			var data = yield getRawBody(this.req, {
				length: this.length,
				limit: '1mb',
				encoding: this.charset
			});

			// content为xml对象
			var content = yield util.parseXMLAsync(data);
			/*{ xml:
			   { ToUserName: [ 'gh_f822ae2677e8' ],
			     FromUserName: [ 'oPcHb1LOlV_NF5KApGa9RAfJ-Ygk' ],
			     CreateTime: [ '1503066159' ],
			     MsgType: [ 'event' ],
			     Event: [ 'subscribe' ],
			     EventKey: [ '' ] } }*/

			// message为处理过xml的数据
			var message = util.formatMessage(content.xml);
			/*{ ToUserName: 'gh_f822ae2677e8',
			  FromUserName: 'oPcHb1LOlV_NF5KApGa9RAfJ-Ygk',
			  CreateTime: '1503066159',
			  MsgType: 'event',
			  Event: 'subscribe',
			  EventKey: '' }*/

			// 判断masgType的类型为event事件
			if (message.MsgType === 'event') {
				// Event为subscribe订阅事件
				if (message.Event === 'subscribe') {
					var now = new Date().getTime();
					
					// 设置回复的状态	
					that.status = 200;
					// 回复的类型xml格式
					that.type = 'application';
					// 回复的主题
					var reply = '<xml>' +
						'<ToUserName><![CDATA[' + message.FromUserName + ']]></ToUserName>' +
						'<FromUserName><![CDATA[' + message.ToUserName + ']]></FromUserName>' +
						'<CreateTime>' + now + '</CreateTime>' +
						'<MsgType><![CDATA[text]]></MsgType>' +
						'<Content><![CDATA[Hi, 欢迎来到微笑影业微信公众号]]></Content>' +
						'<MsgId>' + message.MsgId + '</MsgId>' +
						'</xml>'

					// 自动回复的内容
					that.body = reply;
					return;
				}
			}

		}
	}	

}