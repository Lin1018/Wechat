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
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/public/videos/lq.mp4');

			reply = {
				type: 'video',
				title: '小视频',
				description: '玩个球!',
				mediaId: data.media_id,
			}

		} else if (content === '8') {
			var data = yield wechatApi.uploadMaterial('image', __dirname + '/public/images/2.jpg');

			reply = {
				type: 'music',
				title: '告白气球',
				description: 'jay',
				musicUrl: 'http://sc1.111ttt.com/2016/1/06/25/199251943186.mp3',
				thumbMediaId: data.media_id
			}
		} else if (content === '9') {
			// 上传永久素材(未授权)
			var data = yield wechatApi.uploadMaterial('video', __dirname + '/public/videos/lq.mp4', {type: 'video', description: '{"title": "一个好的微信公众号", "introduction": "简简单单"}'});

			reply = {
				type: 'video',
				title: '小视频1',
				description: '上传个小视频！',
				mediaId: data.media_id
			}
		} else if (content === '10') {
			// 上传image类型的永久素材(获取素材id,上传图文)
			var picData = yield wechatApi.uploadMaterial('image', __dirname + '/public/images/1.jpg', {});

			var media = {
				atricles: [{
					title: '111111',
					thumb_media_id: picData.media_id,
					author: 'Lin',
					digest: '简单的摘要',
					show_cover_pic: 1,
					content: '没有内容',
					content_source_url: 'https://github.com'
				},{
					title: '222222',
					thumb_media_id: picData.media_id,
					author: 'Lin',
					digest: '简单的摘要',
					show_cover_pic: 1,
					content: '没有内容',
					content_source_url: 'https://github.com'
				}]
			}

			// 上传图文
			data = yield wechatApi.uploadMaterial('news', media, {});

			// 通过media_id找到图文数据			
			data = yield wechatApi.fetchMaterial(data.media_id, 'news', {});

			// 获取图文素材
			var items = data.news_item;
			var news = [];

			// 遍历图文素材
			items.forEach(function(item) {
				news.push({
					title: item.title,
					description: item.digest,
					picUrl: picData.url,
					url: item.url
				})
			});

			// 回复的内容
			reply = news;
		} else if (content === '11') {
			// 获取素材总数
			var counts = yield wechatApi.countMaterial();
			console.log(JSON.stringify(counts));

			// 获取素材列表
			var results = yield [
				wechatApi.batchMaterial({
					type: 'image',
					offset: 0,
					count: 10
				}),
				wechatApi.batchMaterial({
					type: 'video',
					offset: 0,
					count: 10
				}),
				wechatApi.batchMaterial({
					type: 'voice',
					offset: 0,
					count: 10
				}),
				wechatApi.batchMaterial({
					type: 'news',
					offset: 0,
					count: 10
				}),
			]
			
			console.log(JSON.stringify(results));

			reply = JSON.stringify(results);
		} else if (content === '12') {
			// 创建标签
			var tag = yield wechatApi.createTag('333');

			console.log('wechat新标签');
			console.log(tag);

			// 查看标签列表
			var tags = yield wechatApi.getCreatedTag();

			console.log('标签列表：');
			console.log(tags);

			// 查看用户标签
			var tag2 = yield wechatApi.fetchTag(message.FromUserName);

			console.log('查看用户的标签');
			console.log(tag2);

			reply = 'Tag done!';
		} else if (content === '13') {
		// 获取用户信息
		var user = yield wechatApi.fetchUser(message.FromUserName);

		console.log(user);

		var openIds = [
			{
				openid: message.FromUserName,
				lang: 'en'
			}
		];

		// 批量获取用户信息
		var users = yield wechatApi.fetchUser(openIds);

		console.log(users);

		reply = JSON.stringify(user);
	} else if (content === '14') {
		// 获取用户列表
		var userList = yield wechatApi.listUsers();

		console.log(userList);

		reply = userList.total;
	} else if (content === '15') {
		// 根据标签群发图文消息
		var mpnews = {
			media_id: 'LuqWADudnWHVv88T31EY6WRiAwrjp1Oj4nlr8WJzkzw',
		}

		var msgData = yield wechatApi.sendByTag('mpnews', mpnews, 2);
		console.log(msgData)
		reply = 'Yeah!';
	} else if (content === '150') {
		// 根据标签群发文本消息
		var text = {	
			'content': 'Hello, Wechat!'
		}

		var msgData = yield wechatApi.sendByTag('text', text, 2);
		console.log(msgData);

		reply = 'Yeah!';
	} else if (content === '16') {
		// 预览接口(预览text类型的群发消息)
		var text = {
			'content': 'Hello, Wechat!'
		}
		// 预览图文消息
		// var mpnews = {
		// 	media_id: 'LuqWADudnWHVv88T31EY6WRiAwrjp1Oj4nlr8WJzkzw',
		// }

		var msgData = yield wechatApi.previewMass('text', text, 'oVuRY0bxT8y11WEL0WN83Dlf6ng4'); // toUserName

		console.log(msgData);
		reply = 'Yeah!';
	} else if (content === '17') {
		// 查询群发消息发送状态 (参数为msg_id)
		var msgData = yield wechatApi.checkMass('1000000016');

		console.log(msgData);
		reply = 'Yeah mass success!'
	}

		this.body = reply;
	}

	yield next;
}