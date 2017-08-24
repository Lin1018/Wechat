'use strict'

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const _ = require('lodash');
const fs = require('fs');
const util = require('./util.js');

const prefix = 'https://api.weixin.qq.com/cgi-bin/';
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
	}
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
						throw new Error('Batch material fails');
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
						throw new Error('Batch material fails');
					}
				})
				.catch(function(err) {
					reject(err);
				});

			});
	});

}

// 获取用户身上的标签
Wechat.prototype.fetchTag = function(openid) {
	var that = this;

	return new Promise(function(resolve, reject) {
		that
		  .fetchAccessToken()  // 获取全局票据
		    .then(function(data) {
				var url = api.tag.get + 'access_token=' + data.access_token;

				var form = {
					openid: openid
				}

				// GET请求,不需要传递数据
				request({method: 'POST', url: url, body:form, json:true}).then(function(response) {
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