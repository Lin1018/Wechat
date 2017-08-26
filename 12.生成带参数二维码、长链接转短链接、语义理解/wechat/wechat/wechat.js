'use strict'

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const _ = require('lodash');
const fs = require('fs');
const util = require('./util.js');

const prefix = 'https://api.weixin.qq.com/cgi-bin/';
const mpPrefix = 'https://mp.weixin.qq.com/cgi-bin/';
// 语义理解接口
const semanticUrl = 'https://api.weixin.qq.com/semantic/semproxy/search?';
var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	// 临时素材接口
	temporary: {
		// 新增临时素材
		upload: prefix + 'media/upload?',
		// 获取临时素材
		fetch: prefix + 'media/get?'
	},
	// 永久素材接口
	permanent: {
		// 新增图片和视频素材
		upload: prefix + 'material/add_material?',
		// 获取图文和视频素材
		fetch: prefix + 'material/get_material?',
		// 新增图文素材
		uploadNews: prefix + 'material/add_news?',
		// 新增图文消息内的图片
		uploadNewsPic: prefix + 'media/uploadimg?',
		// 删除永久素材
		delete: prefix + 'material/del_material?',
		// 修改永久素材
		update: prefix + 'material/update_news?',
		// 获取素材总数
		count: prefix + 'material/get_materialcount?',
		// 获取素材列表
		batch: prefix + 'material/batchget_material?'
	},
	// 用户标签接口
	tag: {
		// 创建标签
		create: prefix + 'tags/create?',
		// 获取公众号已创建的标签
		get: prefix + 'tags/get?',
		// 编辑标签
		update: prefix + 'tags/update?',
		// 删除标签
		delete: prefix + 'tags/delete?',
		// 获取标签下粉丝列表
		fans: prefix + 'user/tag/get?',
		// 批量为用户打标签
		batchUpdate: prefix + 'tags/members/batchtagging?',
		// 批量为用户取消标签
		batchCancel: prefix + 'tags/members/batchuntagging?',
		// 获取用户身上的标签
		fetchTag: prefix + 'tags/getidlist?'
	},
	// 获取用户基本信息接口
	user: {
		// 设置用户备注名
		remark: prefix + 'user/info/updateremark?',
		// 获取用户的基本信息
		fetch: prefix + 'user/info?',
		// 批量获取用户的信息
		batchFetch: prefix + 'user/info/batchget?',
		// 获取用户列表
		list: prefix + 'user/get?'
	},
	// 群发消息接口
	mass: {
		// 根据标签群发
		tag: prefix + 'message/mass/sendall?',
		// 根据openid群发消息
		openId: prefix + 'message/mass/send?',
		// 删除群发
		delete: prefix + 'message/mass/delete?',
		// 预览接口
		preview: prefix + 'message/mass/preview?',
		// 查询群发消息发送状态
		check: prefix + 'message/mass/get?'
	},
	// 自定义菜单
	menu: {
		// 创建菜单
		create: prefix + 'menu/create?',
		// 查询
		get: prefix + 'menu/get?',
		// 删除
		delete: prefix + 'menu/delete?',
		// 获取自定义菜单配置
		current: prefix + 'get_current_selfmenu_info?'
	},
	// 生成带参数的二维码
	qrcode: {
		// 创建二维码
		create: prefix + 'qrcode/create',
		// 通过ticket换取二维码
		show: mpPrefix + 'showqrcode?'
	},
	// 长链接转短链接
	shortUrl: {
		create: prefix + 'shorturl?'
	},
	// 语义理解接口
	semanticUrl:semanticUrl
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

// 更新票据的方法
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

// 获取access_token
Wechat.prototype.fetchAccessToken = function() {
	var that = this;

	if (this.access_token && this.expires_in) {
		if (this.isValidAccessToken(this)) {
			return Promise.resolve(this);
		}
	}

	return that.getAccessToken()
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
}

// 新增临时或永久素材接口方法
Wechat.prototype.uploadMaterial = function(type, material, permanent) {
	var that = this;
	var form = {}

	// 默认为临时素材上传地址
	var uploadUrl = api.temporary.upload; 

	// 若传入了permanent参数，则为上传永久素材
	if (permanent) {
		uploadUrl = api.permanent.upload;

		// form兼容所有的上传类型,包括图文类型
		_.extend(form, permanent);  // 继承permanent对象
	}

	if (type === 'pic') {
		// 图文消息中要上传的图片
		uploadUrl = api.permanent.uploadNewsPic;
	}

	if (type === 'news') {
		// 上传图文
		uploadUrl = api.permanent.uploadNews;
		form = material;
	} else {
		form.media = fs.createReadStream(material);
	}

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
			.then(function(data) {
				var url = uploadUrl + 'access_token=' + data.access_token;

				if (!permanent) {
					url += '&type=' + type;
				} else {
					form.access_token = data.access_token;
				}

				var options = {
					method: 'POST',
					url: url,
					json: true
				}

				if (type === 'news') {
					options.body = form;
				} else {
					options.formData = form;
				}

				// POST请求
				request(options).then(function(response) {
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

// 获取(下载)永久素材方法
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
	var that = this;
	var form = {}
	// 默认为临时素材获取地址
	var fetchUrl = api.temporary.fetch; 

	// 若传入了permanent参数，则为获取永久素材
	if (permanent) {
		fetchUrl = api.permanent.fetch;
	}

  return new Promise(function(resolve, reject) {
    that
      .fetchAccessToken()
      .then(function(data) {
        var url = fetchUrl + 'access_token=' + data.access_token
        var form = {}
        var options = {method: 'POST', url: url, json: true}

        if (permanent) {
          form.media_id = mediaId
          form.access_token = data.access_token
          options.body = form
        } else {
	          if (type === 'video') {
	            url = url.replace('https://', 'http://')
	          }

	          url += '&media_id=' + mediaId
        }

        if (type === 'news' || type === 'video') {
          request(options).then(function(response) {
            var _data = response.body

            if (_data) {
              resolve(_data)
            } else {
              throw new Error('Fetch material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        } else {
          resolve(url)
        }
      })
  })

}

// 删除永久素材方法
Wechat.prototype.deleteMaterial = function(mediaId) {
	var that = this;
	var form = {
		media_id: mediaId
	}

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.permanent.delete + 'access_token=' + data.access_token + '&media_id=' + mediaId;

				// POST请求
				request({method: 'POST', url: url, body: form, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Delete material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 修改永久素材方法
Wechat.prototype.updateMaterial = function(mediaId, news) {
	var that = this;
	var form = {
		media_id: mediaId
	}

	// 继承传入的news
	_.extend(form, news);

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId;

				// POST请求
				request({method: 'POST', url: url, body: form, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Update material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取素材总数
Wechat.prototype.countMaterial = function() {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.permanent.count + 'access_token=' + data.access_token;

				// 获取资源的方法为GET
				request({method: 'GET', url: url, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Count material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});	
	});

}

// 获取素材列表
Wechat.prototype.batchMaterial = function(options) {
	var that = this;

	// 获取的类型
	options.type = options.type || 'image';
	// 获取的偏移量
	options.offset = options.offset || 0;
	// 获取的总数
	options.count = options.count || 1;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.permanent.batch + 'access_token=' + data.access_token;

				// POST请求
				request({method: 'POST', url: url, body: options, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Batch material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 创建标签
Wechat.prototype.createTag = function(name) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.tag.create + 'access_token=' + data.access_token;

				var form = {
					tag: {
						name: name
					}
				}

				// POST请求
				request({method: 'POST', url: url, body: form, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Create tag fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取公众号已经创建的标签
Wechat.prototype.getCreatedTag = function() {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.tag.get + 'access_token=' + data.access_token;

				// GET请求,不需要传递数据
				request({url: url, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Get created fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取用户身上的标签
Wechat.prototype.fetchTag = function(openId) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.tag.get + 'access_token=' + data.access_token;

				var form = {
					openid: openId
				}

				// POST请求
				request({method: 'POST', url: url, body:form, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Fetch tag fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 设置用户备注名
Wechat.prototype.remarkUser = function(openId, remark) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.user.remark + 'access_token=' + data.access_token;

				var form = {
					openid: openId,
					remark: remark
				}

				// POST请求
				request({method: 'POST', url: url, body:form, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Remark user fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 单个获取和批量获取用户基本信息
Wechat.prototype.fetchUser = function(openIds, lang) {
	var that = this;

	// lang默认初始值为简体
  lang = lang || 'zh_CN';  

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {

		    	var options = {
		    		json: true
		    	};

		    	// 引用lodash中的方法,判断如果openId为数组,则为批量获取
		    	if (_.isArray(openIds)) {
		    		options.url = api.user.batchFetch + 'access_token=' + data.access_token;

		    		options.body = {
							user_list: openIds
						};
						options.method = 'POST';
		    	} else {
		    		// 单个获取
		    		options.url = api.user.fetch + 'access_token=' + data.access_token + '&openid=' + openIds + '&lang=' + lang;
		    	}

				request(options).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Fetch user fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取用户的列表
Wechat.prototype.listUsers = function(openId) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.user.list + 'access_token=' + data.access_token;

				if (openId) {
					url += '&next_openid=' + openId; 
				}

				// GET请求
				request({url: url, json:true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('List user fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 根据标签群发消息
Wechat.prototype.sendByTag = function(type, message, tagId) {
	var that = this;
	var msg = {
		filter: {},
		msgtype: type,
	}
	// 把传入的message作为msg中的type属性存储
	msg[type] = message;


	// 若未传入tagId，则为群发给所有人
	if (!tagId) {
		msg.filter.is_to_all = true;
	} else {
	    // 发给某个标签
		msg.filter = {
			is_to_all: false,
			tag_id: tagId
		}
	}

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.mass.tag + 'access_token=' + data.access_token;

				// POST请求
				request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Send to tag fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 根据openid群发消息
Wechat.prototype.sendByOpenId = function(type, message, openIds) {
	var that = this;
	var msg = {
		msgtype: type,
		touser: openIds
	}
	// 把传入的message作为msg中的type属性存储
	msg[type] = message;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.mass.openId + 'access_token=' + data.access_token;

				// POST请求
				request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Send by openid fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 删除群发
Wechat.prototype.deleteMass = function(type, message, openIds) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.mass.delete + 'access_token=' + data.access_token;

				var form = {
					msg_id: msgId
				}

				// POST请求
				request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Delete mass fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 预览接口
Wechat.prototype.previewMass = function(type, message, openId) {
	var that = this;
	var msg = {
		msgtype: type,
		touser: openId
	}

	msg[type] = message;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.mass.preview + 'access_token=' + data.access_token;

				// POST请求
				request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Preview mass fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 查询群发消息发送状态
Wechat.prototype.checkMass = function(msgId) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.mass.check + 'access_token=' + data.access_token;

				var form = {
					msg_id: msgId
				}
				// POST请求
				request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Check mass fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 创建菜单
Wechat.prototype.createMenu = function(menu) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.menu.create + 'access_token=' + data.access_token;
				
				// POST请求
				request({method: 'POST', url: url, body: menu, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Create menu fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 查询菜单结构
Wechat.prototype.getMenu = function(menu) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.menu.get + 'access_token=' + data.access_token;

				// GET请求
				request({url: url, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Get menu fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});	

			});
	});

}

// 删除菜单
Wechat.prototype.deleteMenu = function(menu) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.menu.delete + 'access_token=' + data.access_token;

				// GET请求
				request({url: url, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Delete menu fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取自定义菜单配置
Wechat.prototype.getCurrentMenu = function(menu) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.menu.current + 'access_token=' + data.access_token;

				// GET请求
				request({url: url, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {

						resolve(_data);
					} else {
						throw new Error('Get current menu fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 创建临时/永久二维码
Wechat.prototype.createQrcode = function(qr) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.qrcode.create + 'access_token=' + data.access_token;

				// POST请求
				request({method: 'POST', url: url, body: qr, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Create qrcode fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 通过ticket换取二维码
Wechat.prototype.showQrcode = function(ticket) {
	return api.qrcode.show + 'ticket=' + encodeURI(ticket);
}

// 长链接转短链接
Wechat.prototype.createShorturl = function(action, url) {
	action = action || 'long2short';

	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.shortUrl.create + 'access_token=' + data.access_token;

				var form = {
					action: action,
					long_url: url
				}

				// POST请求
				request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Show qrcode fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 语义理解接口
Wechat.prototype.semantic = function(semanticData) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.semanticUrl + 'access_token=' + data.access_token;

				semanticData.appid = data.appID;

				// POST请求
				request({method: 'POST', url: url, body: semanticData, json: true}).then(function(response) {
					var _data = response.body;

					if (_data) {
						resolve(_data);
					} else {
						throw new Error('Semantic fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

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