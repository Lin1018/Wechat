'use strict'

const config = require('./config.js');
const Wechat = require('./wechat/wechat.js');
const wechatApi = new Wechat(config.wechat);

exports.reply = function* (next) {
	var message = this.weixin;

	// event事件类型
	if (message.MsgType === 'event') {
		if (message.Event === 'subscribe') {
			if (message.EventKey) {
				console.log('扫描二维码进来：' + message.EventKey + '' + message.ticket);
			}

			this.body = '欢迎订阅微笑影业公众号！\r\n';
		} else if (message.Event === 'unsubscribe') {
			console.log('取消关注！');
			this.body = '';
		} else if (message.Event === 'LOCATION') {
			this.body = '您的当前位置为：' + message.Latitude + '/' + message.Longitude + '-' + message.Precision;
		} else if (message.Event === 'CLICK') {
			this.body = '点击菜单：' + message.EventKey;
		} else if (message.Event === 'SCAN') {
			console.log('关注后扫描二维码' + message.EventKey+ '' + message.Ticket); 

			this.body = '扫描成功';
		} else if (message.Event === 'VIEW') {
			this.body = '点击菜单中的链接：' + message.EventKey;
		}

	} else if (message.MsgType === 'text') {
		var content = message.Content;
		var reply = '无法识别' + message.Content;

		if (content === '1') {
			reply = '回复111111';
		} else if (content === '2') {
			reply = '回复222222';
		} else if (content === '3') {
			reply = '回复333333';
		} else if (content === '4') {
			reply = [{
				title: '技术改变世界',
				description: '一条简单的描述',
				picUrl: 'http://pic.baike.soso.com/p/20130515/bki-20130515150325-379335333.jpg',
				url: 'https://github.com/'
			}];	
		}  else if (content === '5') {
			reply = [{
				title: '技术改变世界',
				description: '一条简单的描述',
				picUrl: 'http://pic.baike.soso.com/p/20130515/bki-20130515150325-379335333.jpg',
				url: 'https://github.com/'
			},{
				title: 'Nodejs',
				description: 'node微信开发',
				picUrl: 'https://img6.bdstatic.com/img/image/smallpic/touxixiaoqinx.jpg',
				url: 'https://nodejs.org/'
			}];
		} else if (content === '6') {
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/public/images/2.jpg');

			reply = {
				type: 'image',
				mediaId: data.media_id
			}
		} else if (content === '7') {
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/public/videos/vdo.mp4');

			reply = {
				type: 'video',
				title: '小视频',
				description: 'jay!',
				mediaId: data.media_id,
			}

			console.log(reply);
		} else if (content === '8') {
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/public/images/2.jpg');

			reply = {
				type: 'music',
				title: '告白气球',
				description: 'jay',
				musicUrl: 'http://sc1.111ttt.com/2016/1/06/25/199251943186.mp3',
				thumbMediaId: data.media_id
			}
		}

		this.body = reply;
	}

	yield next;
}