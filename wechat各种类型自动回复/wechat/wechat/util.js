'use strict'

const xml2js = require('xml2js');
const Promise = require('bluebird');
const tpl = require('./tpl');

exports.parseXMLAsync = function(xml) {
	return new Promise(function(resolve, reject) {
		xml2js.parseString(xml, {trim: true}, function(err, content) {
			if (err) {
				reject(err);
			} else {
				resolve(content);
			}
		});
	});
	
}

// 格式化xml
function formatMessage(result) {
	var message = {};

	if (typeof result === 'object') {
		var keys = Object.keys(result);  // keys为result对象键名

		for (var i=0; i<keys.length; i++) {
			var item = result[keys[i]];  // item为value
			var key = keys[i];

			if (!(item instanceof Array) || item.length === 0) {
				continue;
			}

			if(item.length === 1) {
				var val = item[0];

				if (typeof val === 'object') {
					message[key] = formatMessage(val);
				} else {
					message[key] = (val || '').trim();
				}
			} else {
				message.key = [];

				for (var j=0; j<item.length; j++) {
					message[key].push( formatMessage(item[j]) );
				}
			}

		}
	}

	return message;
}

exports.formatMessage = formatMessage;

exports.tpl = function(content, message) {
	// 存储回复的内容
	var info = {};
	var type = 'text';
	var fromUserName = message.FromUserName;
	var toUserName = message.ToUserName;
	var msgId = message.MsgId;

	// content为数组，则为图文消息
	if (Array.isArray(content)) {
		type = 'news';
	}
	
	// 若为传递过来的type，则覆盖当前type
	type = content.type || type;
	info.content = content;
	info.createTime = new Date().getTime();
	info.msgType = type;
	info.toUserName = fromUserName;
	info.fromUserName = toUserName;
	info.msgId = msgId;

	return tpl.compiled(info);
}