'use strict'

const xml2js = require('xml2js');
const Promise = require('bluebird');

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