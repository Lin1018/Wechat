'use strict'

const sha1 = require('sha1');
const getRawBody = require('raw-body');
const Wechat = require('./wechat.js');
const util = require('./util.js');

module.exports = function(options, handler) {
	// 实例化构造函数
	var wechat = new Wechat(options);

	return function *(next) {
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

			// 解析后的message挂载到weixin
			this.weixin = message;

			// 交给外层，对解析后的消息做分析和回复
			yield handler.call(this, next);

			// 外层逻辑处理完，这里为真正的回复
			wechat.reply.call(this);
		}
	}	

}