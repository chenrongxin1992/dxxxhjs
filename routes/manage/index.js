var express = require('express');
var router = express.Router();
const ejsExcel = require('ejsexcel')
const fs = require('fs')
const multiparty = require('multiparty')
const path = require('path')
const async = require('async')
const cat = require('../../db/cat').catinfo
const uploadDir = path.resolve(__dirname, '../../uploads');
const urlencode = require('urlencode')
const moment = require('moment')
const sjsz = require('../../db/cat').sjsz
const request = require('request')
const stu_exam = require('../../db/cat').stu_exam
const nodeExcel = require('excel-export')

//redis
const redis = require('redis')
const client = redis.createClient({host:'127.0.0.1', port: 6379,no_ready_check:true})
// if you'd like to select database 3, instead of 0 (default), call 
// client.select(3, function() { /* ... */ }); 

client.on("error", function (err) {
    console.log("redis connect Error " + err);
});
client.on('connect',function(err){
	console.log("redis connect success " + err);
})

let MyServer = "http://116.13.96.53:81",
	//CASserver = "https://auth.szu.edu.cn/cas.aspx/",
	CASserver = 'https://authserver.szu.edu.cn/authserver/',
	ReturnURL = "http://116.13.96.53:81";

//正则匹配
function pipei(str,arg){
	let zhengze = '<cas:' + arg + '>(.*)<\/cas:' + arg + '>' 
	let res = str.match(zhengze)
	if(res){
		return res[1]
	}else{
		return null
	}
}

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log('in index router')

	if(!req.query.ticket){
		let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
		console.log('ReturnURL url-->',ReturnURL)
		let url = CASserver + 'login?service=' + ReturnURL
		//console.log('check redirecturl -->',url)
		console.log('---------- 没有ticket ----------')

		client.get('sess:'+req.sessionID,function(rediserr,redisres){
	      if(rediserr){
	        next(new Error(rediserr))
	      }
	      if(!redisres){
	        console.log('redis 没有session ,跳转获取---->',url)
	        return res.redirect(url)
	      }
	      if(redisres && redisres!='undefined'){
	        let result = JSON.parse(redisres)
	        console.log('redis session 信息---->',result)
	        return res.render('manage/index', { 'user': result ,'student':result.student});
	      }
	    })

		/*if(req.session.user){
			console.log('没有ticket,学生有session')
			console.log('session-->',req.session.user)
			//返回页面让学困生填写联系方式，并将code对应的课程和学优生信息返回
			//如果学生已经选择好学优生，则直接显示最后结果
			//这一步加上判断，看学生是否已经选择了该辅导学生
			res.render('manage/index', { 'user': req.session.user });
		}
		else{
			console.log('没有ticket，去获取ticket')
			return res.redirect(url)
		}*/
	}
	else{
		let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
		console.log('ReturnURL url-->',ReturnURL)
		let url = CASserver + 'login?service=' + ReturnURL
		//console.log('check redirecturl -->',url)
		console.log('---------- 有ticket ----------')

		client.get('sess:'+req.sessionID,function(rediserr,redisres){
	      if(rediserr){
	        next(new Error(rediserr))
	      }
	      if(!redisres){
	        console.log('redis 没有session ,request 获取---->')
	        let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl,
				finalReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs'
			console.log('ReturnURL url-->',ReturnURL)
			console.log('req-->',req.baseUrl)//finalReturnURL
			console.log('you ticket, meiyou session')
			let ticket = req.query.ticket
			console.log('check ticket-->',ticket)
			let url = CASserver + 'serviceValidate?ticket=' + ticket + '&service=' + ReturnURL
			console.log('check url -->',url)
			request(url, function (error, response, body) {
				console.log('dddddd')
				    if (!error && response.statusCode == 200) {
				    	console.log('body -- >',body)
				       let user = pipei(body,'user'),//工号
						   eduPersonOrgDN = pipei(body,'eduPersonOrgDN'),//学院
						   alias = pipei(body,'alias'),//校园卡号
						   cn = pipei(body,'cn'),//姓名
						   gender = pipei(body,'gender'),//性别
						   containerId = pipei(body,'containerId'),//个人信息（包括uid，）
						   nianji = null
						if(containerId){
							RankName = containerId.substring(18,21)//卡类别 jzg-->教职工
						}else{
							RankName = null
						}
						if(user){
						   	nianji = user.substring(0,4)
						}else{
						   	nianji = null
						}
						console.log('check final result -->',user,eduPersonOrgDN,alias,cn,gender,containerId,RankName)
						let arg = {}
							arg.nianji = nianji
						   	arg.user = user
						   	arg.eduPersonOrgDN = eduPersonOrgDN
						   	arg.alias = alias
						   	arg.cn = cn
						   	arg.gender = gender
						   	arg.containerId = containerId
						   	arg.RankName = RankName
						   	//arg.code = code
						   	//arg.stuXueHao = stuXueHao
						    console.log('check arg-->',arg)

						   console.log('check arg-->',arg)
						   if(arg.user == null){
						   		console.log('ticket is unvalid,重新回去获取ticket，清空session')
						   		delete req.session.user
						   		console.log('check req.session.user-->',req.session.user)
						   		console.log('ticket is unvalid')
						   		return res.redirect(finalReturnURL)
						   		//return res.json({'errCode':-1,'errMsg':'ticket is unvalid,请重新扫码！'})
						   }else{
						   		req.session.user = arg
						   		req.session.student = arg
						   		arg = null
						   		return res.redirect(finalReturnURL)
						   		//return res.redirect(ReturnURL)
						  }
				     }else{
				     	console.log(error)
				     }
			    })
	      }
	      if(redisres && redisres!='undefined'){
	        let result = JSON.parse(redisres)
	        console.log('redis session 信息---->',result)
	        return res.render('manage/index', { 'user': result ,'student':result.student});
	      }
	    })
		/*if(req.session.user){
			console.log('有ticket,也有session')
			console.log('session-->',req.session.user)
			res.render('manage/index',{'user': req.session.user });
		}
		else{
			let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl,
				finalReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs'
			console.log('ReturnURL url-->',ReturnURL)
			console.log('req-->',req.baseUrl)//finalReturnURL
			console.log('you ticket, meiyou session')
			let ticket = req.query.ticket
			console.log('check ticket-->',ticket)
			let url = CASserver + 'serviceValidate?ticket=' + ticket + '&service=' + ReturnURL
			console.log('check url -->',url)
			request(url, function (error, response, body) {
				console.log('dddddd')
				    if (!error && response.statusCode == 200) {
				    	console.log('body -- >',body)
				       let user = pipei(body,'user'),//工号
						   eduPersonOrgDN = pipei(body,'eduPersonOrgDN'),//学院
						   alias = pipei(body,'alias'),//校园卡号
						   cn = pipei(body,'cn'),//姓名
						   gender = pipei(body,'gender'),//性别
						   containerId = pipei(body,'containerId'),//个人信息（包括uid，）
						   nianji = null
						if(containerId){
							RankName = containerId.substring(18,21)//卡类别 jzg-->教职工
						}else{
							RankName = null
						}
						if(user){
						   	nianji = user.substring(0,4)
						}else{
						   	nianji = null
						}
						console.log('check final result -->',user,eduPersonOrgDN,alias,cn,gender,containerId,RankName)
						let arg = {}
							arg.nianji = nianji
						   	arg.user = user
						   	arg.eduPersonOrgDN = eduPersonOrgDN
						   	arg.alias = alias
						   	arg.cn = cn
						   	arg.gender = gender
						   	arg.containerId = containerId
						   	arg.RankName = RankName
						   	//arg.code = code
						   	//arg.stuXueHao = stuXueHao
						    console.log('check arg-->',arg)

						   console.log('check arg-->',arg)
						   if(arg.user == null){
						   		console.log('ticket is unvalid,重新回去获取ticket，清空session')
						   		delete req.session.user
						   		console.log('check req.session.user-->',req.session.user)
						   		console.log('ticket is unvalid')
						   		return res.redirect(finalReturnURL)
						   		//return res.json({'errCode':-1,'errMsg':'ticket is unvalid,请重新扫码！'})
						   }else{
						   		req.session.user = arg
						   		return res.redirect(finalReturnURL)
						   		//return res.redirect(ReturnURL)
						  }
				     }else{
				     	console.log(error)
				     }
			    })
		}*/
	}
  
});

router.get('/managelogin',function(req,res){
	console.log('in managelogin router')
	res.render('manage/managelogin')
})

router.get('/drtk',function(req,res){
	console.log('in drtk router')
	res.render('manage/drtk')
})

//分割答案函数(多选)
/*返回答案对应的id*/
function getdaan_duoxuan(strarg){
	if(strarg.trim()){
		//A-H分别用id：0-8代表
		let daid_arr = []
		let daan_arr = strarg.trim().split('')
		console.log('check daan_arr-->',daan_arr)
		for(let i=0;i<daan_arr.length;i++){
			switch(daan_arr[i].toUpperCase()){
				case 'B':
					console.log('答案含有B')
					daid_arr.push(1)
				break;
				case 'C':
					console.log('答案含有C')
					daid_arr.push(2)
				break
				case 'D':
					console.log('答案含有D')
					daid_arr.push(3)
				break;
				case 'E':
					console.log('答案含有E')
					daid_arr.push(4)
				break
				case 'F':
					console.log('答案含有F')
					daid_arr.push(5)
				break
				case 'G':
					console.log('答案含有G')
					daid_arr.push(6)
				break
				case 'H':
					console.log('答案含有H')
					daid_arr.push(7)
				break
				default:
					console.log('答案含有A')
					daid_arr.push(0)
			}
		}
		console.log('多选题答案对应id数组-->',daid_arr)
		return daid_arr
	}else{
		return null
	}
}
function getdaan_danxuan(strarg){
	if(strarg.trim()){
		console.log('strarg-->',strarg)
		switch(strarg.trim().toUpperCase()){
			case 'B':
				console.log('答案是B')
				return 1
			break
			case 'C':
				console.log('答案是C')
				return 2
			break
			case 'D':
				console.log('答案是D')
				return 3
			break
			case 'E':
				console.log('答案是E')
				return 4
			break
			case 'F':
				console.log('答案是F')
				return 5
			break
			default:
				console.log('答案是A')
				return 0
		}
	}else{
		return null
	}
}
//判断正确答案
function inarr(arr, obj) {  
    var i = arr.length;  
    while (i--) {  
        if (arr[i] === obj) {  
            return true;  
        }  
    }  
    return false;  
}
router.post('/uploadtk',function(req,res){
	console.log('in uploadtk router')
	var form = new multiparty.Form();
    //设置编码
    form.encoding = 'utf-8';
    //设置文件存储路径
    form.uploadDir = uploadDir
    console.log('form.uploadDir-->',form.uploadDir)
    //设置单文件大小限制
    //form.maxFilesSize = 2 * 1024 * 1024;
    //form.maxFields = 1000;  设置所以文件的大小总和
    
    form.parse(req, function(err, fields, files) {
    	if(err){
    		console.log('parse err',err.stack)
    	}
    	else{
    		console.log('fields->',fields)
    		console.log('files->',files)
    		//同步重命名文件名
		    //fs.renameSync(files.path,files.originalFilename);
		    console.log('读取文件路径-->',files.file[0].path)

		    let exBuf=fs.readFileSync(files.file[0].path)
		    console.log('exBuf-->',exBuf)
		    //使用ejsExcel的getExcelArr将buffer读取为数组
		    ejsExcel.getExcelArr(exBuf).then(exlJson=>{
		    	console.log("---------------- read success:getExcelArr ----------------");
			    let workBook=exlJson;
			    let workSheets=workBook[0];//第一个工作表
			    console.log('workBook-->',workBook)
			    console.log('workSheets-->',workSheets)
			    let count = 0,//计数，排除第一行
			    	catid = 0;//cat id
			    let search = cat.find({},{'id':1})
			    	search.sort({'id':-1})
			    	search.limit(1)
			    	search.exec(function(err,docs){
			    		console.log('workSheets-->',workSheets)
			    		if(err){
			    			console.log('search err',err.stack)
			    			return res.json({'code':-1,'msg':err.stack})
			    		}
			    		if(docs && docs.length != 0){
			    			catid = docs[0].id
			    		}
			    		async.eachLimit(workSheets,1,function(item,cb){
					    	if(count === 0){
					    		count++
					    		cb()
					    	}else{
					    		catid++
					    		console.log('check item-->',item.length)
						    	if(item[1].trim() === '多选'){
						    		console.log('-----该题是多选，去获取对应答案id-----')
						    		let daid_arr = getdaan_duoxuan(item[3])
						    		let arr_xuanxiang = []
						    		for(let i=0;i<item.length-4;i++){
						    			let obj_xuanxiang = {}
						    			//console.log('i-->',i);
						    			if(inarr(daid_arr,i)){
							    			obj_xuanxiang.is_correct = true
							    			obj_xuanxiang.id = 4+i
										    obj_xuanxiang.content = trim_str(item[4+i])
										    arr_xuanxiang.push(obj_xuanxiang)
										    delete obj_xuanxiang
							    		}else{
							    			obj_xuanxiang.is_correct = false
							    			obj_xuanxiang.id = 4+i
										    obj_xuanxiang.content = trim_str(item[4+i])
										    arr_xuanxiang.push(obj_xuanxiang)
										    delete obj_xuanxiang
							    		}
						    		}
						    		console.log('check arr_xuanxiang-->',arr_xuanxiang)
						    		let	new_cat = new cat({
						    			id : catid,
						    			catname : item[0].trim(),
						    			leixing : item[1].trim(),
						    			timu : trim_str(item[2]),
						    			zqda : item[3].trim(),
						    			xuanxiang : arr_xuanxiang,
						    			random : parseInt((Math.random()+0.01)*50)
						    		})
						    		new_cat.save(function(err){
						    			if(err){
						    				console.log('save err ------多选')
						    				cb(err)
						    			}
						    			console.log('save success ------多选')
						    			cb()
						    		})
						    	}else{
						    		console.log('-----该题是单选或者判断，去获取对应答案id-----')
						    		let daid = getdaan_danxuan(item[3])
						    		//构造选项对象数组
						    		if(item[1].trim() === '单选'){
						    			console.log('----- 单选&&答案是-->',daid)
						    			let arr_xuanxiang = []
							    		for(let i=0;i<item.length-4;i++){
							    			let obj_xuanxiang = {}
							    			if(daid == i){
							    				obj_xuanxiang.is_correct = true
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = trim_str(item[4+i])
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}else{
							    				obj_xuanxiang.is_correct = false
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = trim_str(item[4+i])
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}
							    		}
							    		console.log('check arr_xuanxiang-->',arr_xuanxiang)
							    		console.log('check arr_xuanxiang-->',arr_xuanxiang)
							    		let	new_cat = new cat({
							    			id : catid,
							    			catname : item[0].trim(),
							    			leixing : item[1].trim(),
							    			timu : trim_str(item[2]),
							    			zqda : item[3].trim(),
							    			xuanxiang : arr_xuanxiang,
							    			random : parseInt((Math.random()+0.01)*50)
							    		})
							    		new_cat.save(function(err){
							    			if(err){
							    				console.log('save err ------单选')
							    				cb(err)
							    			}
							    			console.log('save success ------单选')
							    			cb()
							    		})
						    		}else{
						    			console.log('----- 判断 -----')
						    			
							    		let	arr_xuanxiang = []
						    			for(let i=0;i<2;i++){
						    				let obj_xuanxiang = {}
						    				if(daid == i){
							    				obj_xuanxiang.is_correct = true
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = trim_str(item[4+i])
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}else{
							    				obj_xuanxiang.is_correct = false
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = trim_str(item[4+i])
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}
						    			}
						    			console.log('check arr_xuanxiang-->',arr_xuanxiang)
						    			console.log('check arr_xuanxiang-->',arr_xuanxiang)
							    		let	new_cat = new cat({
							    			id : catid,
							    			catname : item[0].trim(),
							    			leixing : item[1].trim(),
							    			timu : trim_str(item[2]),
							    			zqda : item[3].trim(),
							    			xuanxiang : arr_xuanxiang,
							    			random : parseInt((Math.random()+0.01)*50)
							    		})
							    		new_cat.save(function(err){
							    			if(err){
							    				console.log('save err ------判断')
							    				cb(err)
							    			}
							    			console.log('save success ------判断')
							    			cb()
							    		})
						    		}
						    	}//单选或选择
						    	//cb()
					    	}//排除第一行
					    },function(err){
					    	if(err){
					    		console.log('async err')
					    		return res.json({'code':-1,'msg':err.stack})
					    	}else{
					    		//删除上传的文件
								console.log('----- 删除上传文件 -----')
								fs.unlinkSync(files.file[0].path)
								return res.json({'code':0,'msg':'导入成功'})
					    	}
					    })//async
			    	})
			    
		    }).catch(error=>{
			    console.log("************** 读表 error!");
			    console.log(error); 
			    return res.json({'code':-1,'msg':error.stack})
			});
    	}//err
    })//form
})
//下载题库模板
router.get('/download_tkmb',function(req, res, next){
	console.log('in download_tkmb router')
	let filename = '题库模板'
	let currFile = uploadDir + '/题库模板.xlsx',
        fReadStream;
    //res.setHeader('Content-Type', 'application/vnd.openxmlformats');
    //res.setHeader("Content-Disposition", "attachment; filename=" + urlencode(excelName) + ".xlsx")
    fs.exists(currFile,function(exist) {
        if(exist){
            res.set({
                "Content-type":"application/octet-stream",
                "Content-Disposition":"attachment;filename=" + urlencode(filename) + ".xlsx"
            });
            fReadStream = fs.createReadStream(currFile);
            fReadStream.on("data",(chunk) => res.write(chunk,"binary"));
            fReadStream.on("end",function () {
                res.end();
            });
        }else{
            res.set("Content-type","text/html");
            res.send("模板不存在!");
            res.end();
        }
    });
});
//查看题库页面
router.get('/cxtk',function(req,res){
	console.log('in cxtk router')
	//返回题库模块，题目类型
	let search = cat.distinct('catname',function(err,docs){
		if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err.stack})
			}
			console.log('docs-->',docs)
			return res.render('manage/cxtk',{'catname':docs})
	})
})
//查看题库页面数据接口
router.get('/cxtk_data',function(req,res){	
	console.log('in cxtk_data router')
	let page = req.query.page,
		limit = req.query.limit,
		timu = req.query.timu,
		catname = req.query.catname,
		leixing = req.query.leixing
	page ? page : 1;//当前页
	limit ? limit : 15;//每页数据
	timu ? timu : ''
	catname ? catname : null
	leixing ? leixing : null
	const reg = new RegExp(timu, 'i') 
	console.log('check-->reg',reg)
	async.waterfall([
		function(cb){
			let search = cat.find({}).count()
				search.exec(function(err,total){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('记录总数-->',total)
					cb(null,total)
				})
		},
		function(total,cb){
			let numSkip = (page-1)*limit
			limit = parseInt(limit)
			console.log('check -- >',limit,page,numSkip)
			if(timu || catname || leixing){
				console.log('有搜索参数')
				let qs_timu = new RegExp(timu),
					qs_catname = new RegExp(catname),
					qs_leixing = new RegExp(leixing)
				console.log('qs_timu-->',qs_timu)
				console.log('qs_catname-->',qs_catname)
				console.log('qs_leixing-->',qs_leixing)

				let search = cat.find({})
					search.where('timu',qs_timu)
					search.where('catname',qs_catname)
					search.where('leixing',qs_leixing)
					search.sort({'id':1})
					search.limit(limit)
					search.skip(numSkip)
					search.exec(function(err,docs){
						if(err){
							console.log('search err-->',err.stack)
							cb(err)
						}
						console.log('check docs-->',docs.length)
						//增加一步获取数量
						let search1 = cat.find({})
							search1.where('timu',qs_timu)
							search1.where('catname',qs_catname)
							search1.where('leixing',qs_leixing)
							search1.count()
							search1.exec(function(e,d){
								if(e){
									console.log('获取数量出错-->',e)
									cb(e)
								}
								console.log('有参数查询，数量-->',d)
								cb(null,docs,d)
							})
						//total = docs.length
						//cb(null,docs,docs.length)
					})
				}else{
					console.log('无搜索参数')
					let search = cat.find({})
					search.sort({'id':1})
						search.limit(limit)
						search.skip(numSkip)
						search.exec(function(err,docs){
							if(err){
								console.log('search err-->',err.stack)
								cb(err)
							}
							//console.log('check docs-->',docs)
							cb(null,docs,total)
					})
				}
		},
		function(docs,total,cb){
			//重新封装数据
			let data = []//最终数据
			docs.forEach(function(item,index){
				let tempdata = {}
				//console.log('item-->',item)
				tempdata._id = item._id
				tempdata.catid = item.id
				tempdata.inused = item.inused
				tempdata.catname = item.catname
				tempdata.leixing = item.leixing
				tempdata.timu = item.timu
				tempdata.zqda = item.zqda
				item.xuanxiang.forEach(function(it,ind){
					//console.log(it)
					tempdata['xuanxiang' + ind] = it.content +'(' + it.is_correct + ')'
					//tempdata['is_correct' + ind] = it.is_correct
					//console.log(tempdata)
				})
				data.push(tempdata)
				delete tempdata
			})
			data.count = total
			//console.log('返回数据-->',data)
			cb(null,data)
		}
	],function(error,result){
		if(error){
			console.log('search err-->',err.stack)
			return res.json({'code':-1,'msg':err.stack,'count':0,'data':''})
		}
		let count = result.count
		console.log('数据条数-->',count)
		delete result.count
		return res.json({'code':0,'msg':'获取数据成功','count':count,'data':result})
	})
})
//考生成绩
router.get('/kscj_data',function(req,res){	
	console.log('in kscj_data router')
	let page = req.query.page,
		limit = req.query.limit,
		xingming = req.query.xingming,
		kszt = req.query.kszt,
		catname = req.query.catname
	page ? page : 1;//当前页
	limit ? limit : 15;//每页数据
	xingming ? xingming : ''
	kszt ? kszt : null
	catname ? catname : null

	const reg = new RegExp(catname, 'i') 
	console.log('check-->reg',reg)
	async.waterfall([
		function(cb){
			let search = stu_exam.find({}).count()
				search.exec(function(err,total){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('记录总数-->',total)
					cb(null,total)
				})
		},
		function(total,cb){
			let numSkip = (page-1)*limit
			limit = parseInt(limit)
			console.log('check -- >',limit,page,numSkip)
			if(xingming || catname){
				console.log('有搜索参数')
				let qs_xingming = new RegExp(xingming),
					qs_kszt = new RegExp(kszt),
					qs_catname = new RegExp(catname)
				console.log('qs_xingming-->',qs_xingming)
				console.log('qs_kszt-->',qs_kszt)
				console.log('qs_catname-->',qs_catname)

				let search = stu_exam.find({})
					search.where('xingming',qs_xingming)
					search.where('ksname',qs_catname)
					//search.where('qs_catname',qs_catname)
					search.sort({'ksriqi':1})
					search.sort({'xingming':1})
					search.sort({'kscs':1})//升序
					search.limit(limit)
					search.skip(numSkip)
					search.exec(function(err,docs){
						if(err){
							console.log('search err-->',err.stack)
							cb(err)
						}
						console.log('check docs-->',docs.length)
						//增加一步获取数量
						let search1 = stu_exam.find({})
							search1.where('xingming',qs_xingming)
							search1.where('ksname',qs_catname)
							search1.count()
							search1.exec(function(e,d){
								if(e){
									console.log('获取数量出错-->',e)
									cb(e)
								}
								console.log('有参数查询，数量-->',d)
								cb(null,docs,d)
							})
						//total = docs.length
						//cb(null,docs,docs.length)
					})
				}else{
					console.log('无搜索参数')
					let search = stu_exam.find({})
					search.sort({'ksriqi':1})
						search.sort({'xingming':1})
						search.sort({'kscs':1})//升序
						search.limit(limit)
						search.skip(numSkip)
						search.exec(function(err,docs){
							if(err){
								console.log('search err-->',err.stack)
								cb(err)
							}
							//console.log('check docs-->',docs)
							cb(null,docs,total)
					})
				}
		},
		function(docs,total,cb){
			//重新封装数据
			let data = []//最终数据
			docs.forEach(function(item,index){
				let tempdata = {}
				//console.log('item-->',item)
				tempdata._id = item._id
				tempdata.catid = index+1
				tempdata.xingming = item.xingming
				tempdata.gonghao = item.gonghao
				tempdata.ksriqi = item.ksriqi
				tempdata.ksname = item.ksname
				tempdata.kscs = item.kscs
				tempdata.zongfen = item.zongfen
				// item.xuanxiang.forEach(function(it,ind){
				// 	//console.log(it)
				// 	tempdata['xuanxiang' + ind] = it.content +'(' + it.is_correct + ')'
				// 	//tempdata['is_correct' + ind] = it.is_correct
				// 	//console.log(tempdata)
				// })
				data.push(tempdata)
				delete tempdata
			})
			data.count = total
			//console.log('返回数据-->',data)
			cb(null,data)
		}
	],function(error,result){
		if(error){
			console.log('search err-->',err.stack)
			return res.json({'code':-1,'msg':err.stack,'count':0,'data':''})
		}
		let count = result.count
		console.log('数据条数-->',count)
		delete result.count
		return res.json({'code':0,'msg':'获取数据成功','count':count,'data':result})
	})
})
//导出成绩
router.get('/downkscj',function(req,res){
	console.log('in downkscj router')
	let xingming = req.query.xingming,
		catname = req.query.catname

	xingming ? xingming : ''
	catname ? catname : null

	const reg = new RegExp(catname, 'i') 
	console.log('check-->reg',reg)
	let qs_xingming = new RegExp(xingming),
		qs_catname = new RegExp(catname)
		console.log('qs_xingming-->',qs_xingming)
		console.log('qs_catname-->',qs_catname)

	let search = stu_exam.find({})
		search.where('xingming',qs_xingming)
		search.where('ksname',qs_catname)
		search.sort({'ksriqi':1})
		search.sort({'xingming':1})
		search.sort({'kscs':1})//升序
		search.exec(function(err,docs){
			if(err){
				console.log('search err-->',err.stack)
				cb(err)
			}
			if(docs){
				//以下为将数据封装成array数组。因为下面的方法里头只接受数组。
				let vac = new Array();
	            for (let i = 0; i < docs.length; i++) {
	                let temp = new Array();
	                temp[0] = i + 1
	                temp[1] = docs[i].xingming
	                temp[2] = docs[i].gonghao
	                temp[3] = docs[i].ksriqi
	                temp[4] = docs[i].ksname,
	                temp[5] = docs[i].kscs,
	                temp[6] = docs[i].zongfen,
	                vac.push(temp);
	            };
				console.log('check vac -- >',vac)
				//处理excel
			var conf = {};
            conf.stylesXmlFile = "styles.xml";
            //设置表头
            conf.cols = [{
                    caption: '序号',
                    type: 'number',
                    width: 10.6
                }, 
	            {
	                caption: '姓名',
	                type: 'string',
	                width: 28
	            }, 
	            {
                    caption: '校园卡号',
                    type: 'string',
                    width: 35
                }, 
                {
                    caption: '日期',
                    type: 'string',
                    width:35
                },{
                	caption:'考试主题',
                	type:'string',
                	width:35
                },
                {
                    caption: '答题次数',
                    type: 'number',
                    width: 35
                },
                {
                    caption: '得分',
                    type: 'number',
                    width: 35
                }
			];
			conf.rows = vac;//conf.rows只接受数组
			 let excelResult = nodeExcel.execute(conf),
            	excelName = docs[0].ksname
            	console.log(excelName)
            	console.log(urlencode(excelName))
            res.setHeader('Content-Type', 'application/vnd.openxmlformats');
            res.setHeader("Content-Disposition", "attachment; filename=" + urlencode(excelName) + ".xlsx")
            res.end(excelResult, 'binary');
			}
			if(!docs){
				return res.json({'code':-1,'msg':'结果为空'})
			}
		})
	
})
router.post('/delete_item',function(req,res){
	console.log('in delete_item router')
	let _id = req.body._id
	console.log('_id-->',_id)
	cat.remove({'_id':_id},function(err){
		if(err){
			console.log('delete err',err.stack)
			return res.json({'code':-1,'msg':err.stack})
		}
		console.log('delete success',_id)
		return res.json({'code':0,'msg':'delete success'})
	})
})

router.get('/iframe_mb',function(req,res){
	console.log('in iframe_mb router')
	let _id = req.query._id
	console.log('_id-->',_id)
	let search = cat.findOne({})
		search.where('_id').equals(_id)
		search.exec(function(err,doc){
			if(err){
				console.log('err-->',err)
				return res.josn({'code':-1,'msg':err.stack})
			}
			console.log('doc-->',doc)
			return res.render('manage/iframe_mb',{'detail':doc})
		})
})
router.get('/iframe_mbbj',function(req,res){
	console.log('in iframe_mbbj router')
	let _id = req.query._id
	console.log('_id-->',_id)
	let search = sjsz.findOne({})
		search.where('_id').equals(_id)
		search.exec(function(err,doc){
			if(err){
				console.log('err-->',err)
				return res.josn({'code':-1,'msg':err.stack})
			}
			console.log('doc-->',doc)
			let zongfen = parseInt(doc.danxuan_num*doc.danxuan_fenzhi)+parseInt(doc.duoxuan_num*doc.duoxuan_fenzhi)+parseInt(doc.panduan_num*doc.panduan_fenzhi)
			doc.zongfen = zongfen
			doc.allpercent = 100
			return res.render('manage/iframe_mbbj',{'detail':doc})
		})
})

//随机生成字符串
/*
*js生成随即字符串原来如此简单
*toString() radix argument must be between 2 and 36
*/
function random_str() {
	let str =  Math.random().toString(36).substring(5, 9)//4位长度
    return str
}

//const baselink = 'localhost:3000/front/ks?code='
const baselink = 'qiandao.szu.edu.cn:81/dxxxhjs/front/ks?code='
router.get('/sjsz',function(req,res){
	console.log('in sjsz router')
	console.log('sjsz')
	res.render('manage/sjsz')
}).post('/sjsz',function(req,res){
	console.log('in sjsz post router')
	//console.log('post sjsz')
	let ksname = req.body.ksname,
		ksriqi = req.body.ksriqi,
		ksshijian = req.body.ksshijian,
		danxuan_num = req.body.danxuan_num,
		duoxuan_num = req.body.duoxuan_num,
		panduan_num = req.body.panduan_num,
		danxuan_fenzhi = req.body.danxuan_fenzhi,
		duoxuan_fenzhi = req.body.duoxuan_fenzhi,
		panduan_fenzhi = req.body.panduan_fenzhi
	let temp_timeStamp = moment().format('X'),
		temp_num = temp_timeStamp.substring(6),
		temp_randomStr = random_str(),
		randomStr = temp_num + temp_randomStr,
		sjsz_id = 1
	console.log('randomStr-->',randomStr)
	let search = sjsz.find({},{'id':1})
		search.sort({'id':-1})
		search.limit(1)
		search.exec(function(err,doc){
			if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err,stack})
			}
			if(doc && doc.length != 0){
				sjsz_id = doc[0].id + 1
			}

			let sjsz_new = new sjsz({
				id:sjsz_id,
				ksname:ksname,
				ksriqi:ksriqi,
				ksshijian:ksshijian,
				danxuan_num:danxuan_num,
				duoxuan_num:duoxuan_num,
				panduan_num:panduan_num,
				randomStr:randomStr,
				kslianjie:baselink+randomStr+'&what=what',
				danxuan_fenzhi:danxuan_fenzhi,
				duoxuan_fenzhi:duoxuan_num,
				panduan_fenzhi:panduan_fenzhi
			})
			sjsz_new.save(function(err){
				if(err){
					console.log('save err-->',err.stack)
					return res.json({'code':-1,'msg':err,stack})
				}
				return res.json({'code':0,'msg':'设置成功'})
			})
		})
})

router.get('/sjlb_data',function(req,res){
	console.log('in sjlb_data router')
	let page = req.query.page,
		limit = req.query.limit
	page ? page : 1;//当前页
	limit ? limit : 15;//每页数据
	console.log(page,limit)
	async.waterfall([
		function(cb){
			let search = sjsz.find({}).count()
				search.exec(function(err,total){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('记录总数-->',total)
					cb(null,total)
				})
		},
		function(total,cb){
			let numSkip = (page-1)*limit
			limit = parseInt(limit)
			console.log('check -- >',limit,page,numSkip)
			let search = sjsz.find({})
				search.sort({'id':1})
				search.limit(limit)
				search.skip(numSkip)
				search.exec(function(err,docs){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('check docs-->',docs)
					cb(null,docs)
				})
		},
		function(docs,cb){
			//重新封装数据
			//重新封装数据
			let data = []//最终数据
			docs.forEach(function(item,index){
				let tempdata = {}
					console.log('item-->',item)
					tempdata._id = item._id
					tempdata.id = item.id
					tempdata.ksname = item.ksname
					tempdata.ksriqi = item.ksriqi
					tempdata.ksshijian = item.ksshijian
					tempdata.danxuan_fenzhi = item.danxuan_fenzhi
					tempdata.danxuan_num = item.danxuan_num
					tempdata.duoxuan_num = item.duoxuan_num
					tempdata.duoxuan_fenzhi = item.duoxuan_fenzhi
					tempdata.panduan_fenzhi = item.panduan_fenzhi
					tempdata.panduan_num = item.panduan_num
					tempdata.kslianjie = item.kslianjie
					tempdata.ckcs = item.ckcs
					item.per_of_modal.forEach(function(it,ind){
						console.log(it)
						tempdata['mokuai' + ind] = it.name +' (' + it.percent + '%)'
						//tempdata['is_correct' + ind] = it.is_correct
						console.log(tempdata)
					})
					data.push(tempdata)
					delete tempdata
				})
				//data.count = total
				console.log('返回数据-->',data)
				cb(null,data)
		}
	],function(error,result){
		if(error){
			console.log('search err-->',err.stack)
			return res.json({'code':-1,'msg':err.stack,'count':0,'data':''})
		}
		return res.json({'code':0,'msg':'获取数据成功','count':result.length,'data':result})
	})
})
router.get('/newsjlb_data',function(req,res){
	console.log('in newsjlb_data router')
	let page = req.query.page,
		limit = req.query.limit
	page ? page : 1;//当前页
	limit ? limit : 15;//每页数据
	console.log(page,limit)
	async.waterfall([
		function(cb){
			let search = sjsz.find({}).count()
				search.exec(function(err,total){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('记录总数-->',total)
					cb(null,total)
				})
		},
		function(total,cb){
			let numSkip = (page-1)*limit
			limit = parseInt(limit)
			console.log('check -- >',limit,page,numSkip)
			let search = sjsz.find({})
				search.sort({'id':1})
				search.limit(limit)
				search.skip(numSkip)
				search.exec(function(err,docs){
					if(err){
						console.log('search err-->',err.stack)
						cb(err)
					}
					console.log('check docs-->',docs)
					cb(null,docs)
				})
		},
		function(docs,cb){
			//重新封装数据
			//重新封装数据
			let data = []//最终数据
			docs.forEach(function(item,index){
				let tempdata = {}
					console.log('item-->',item)
					tempdata._id = item._id
					tempdata.id = item.id
					tempdata.ksname = item.ksname
					tempdata.ksriqi = item.ksriqi
					tempdata.ksshijian = item.ksshijian
					tempdata.danxuan_fenzhi = item.danxuan_fenzhi
					tempdata.danxuan_num = item.danxuan_num
					tempdata.duoxuan_num = item.duoxuan_num
					tempdata.duoxuan_fenzhi = item.duoxuan_fenzhi
					tempdata.panduan_fenzhi = item.panduan_fenzhi
					tempdata.panduan_num = item.panduan_num
					tempdata.kslianjie = item.kslianjie
					tempdata.ckcs = item.ckcs
					item.per_of_modal.forEach(function(it,ind){
						console.log(it)
						tempdata['mokuai' + ind] = it.name +' (单选:' + it.num_danxuan + ',多选:'+ it.num_duoxuan + ',判断:' + it.num_panduan+')'
						//tempdata['mokuai' + ind] = it.name +' (' + it.percent + '%)'
						//tempdata['is_correct' + ind] = it.is_correct
						console.log(tempdata)
					})
					data.push(tempdata)
					delete tempdata
				})
				//data.count = total
				console.log('返回数据-->',data)
				cb(null,data)
		}
	],function(error,result){
		if(error){
			console.log('search err-->',err.stack)
			return res.json({'code':-1,'msg':err.stack,'count':0,'data':''})
		}
		return res.json({'code':0,'msg':'获取数据成功','count':result.length,'data':result})
	})
})
router.post('/delete_sjlbitem',function(req,res){
	console.log('in delete_sjlbitem router')
	let _id = req.body._id
	console.log('_id-->',_id)
	sjsz.remove({'_id':_id},function(err){
		if(err){
			console.log('delete err-->',err)
			return res.json({'code':-1,'msg':err.stack})
		}
		console.log('delete success')
		return res.json({'code':0,'msg':'delete success'})
	})
})
//新增试卷
router.get('/new_firststep',function(req,res){
	console.log('in new_firststep router')
	//返回题库模块，题目类型
	let search = cat.distinct('catname',function(err,docs){
		if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err.message})
			}
			console.log('docs-->',docs)
			return res.render('manage/new_firststep',{'catname':docs})
	})
	//return res.render('manage/new_firststep')
}).post('/new_firststep',function(req,res){
	console.log('in new_firststep post router')
	let ksname = req.body.ksname,
        ksriqi = req.body.ksriqi,
        ksshijian = req.body.ksshijian,
        danxuan_fenzhi = req.body.danxuan_fenzhi,
        danxuan_num = req.body.danxuan_num,
        duoxuan_fenzhi = req.body.duoxuan_fenzhi,
        duoxuan_num = req.body.duoxuan_num,
        panduan_fenzhi = req.body.panduan_fenzhi,
        panduan_num = req.body.panduan_num,
        per_of_modal = req.body.modal_arr,
        ckcs = req.body.ckcs ? req.body.ckcs : 3
    console.log('ckcs-->',ckcs)
    console.log('per_of_modal-->',JSON.parse(per_of_modal))
    //console.log('req.body-->',req.body)
    //console.log('req.body-->',JSON.parse(req.body))
    //return false
    let temp_timeStamp = moment().format('X'),
		temp_num = temp_timeStamp.substring(6),
		temp_randomStr = random_str(),
		randomStr = temp_num + temp_randomStr

    let tem_arr = [],
    	fuck = JSON.parse(per_of_modal)

    fuck.forEach(function(item,index){
    	let temp_per_of_modal = {}
    	console.log('item-->',item)
    	temp_per_of_modal.id = item.id
    	temp_per_of_modal.name = item.name
    	temp_per_of_modal.percent = item.percent
    	//计算各模块对应题型的抽取数量
    	temp_per_of_modal.num_danxuan = Math.round(danxuan_num*item.percent/100)
    	temp_per_of_modal.num_duoxuan = Math.round(duoxuan_num*item.percent/100)
    	temp_per_of_modal.num_panduan = Math.round(panduan_num*item.percent/100)
    	tem_arr.push(temp_per_of_modal)
    	delete temp_per_of_modal
    	//console.log('tem_arr-->',tem_arr)
    })
    let check_danxuan = 0,
    	check_duoxuan = 0,
    	check_panduan = 0
    console.log('tem_arr',tem_arr)
    console.log()
    console.log()
    tem_arr.forEach(function(item,index){
    	check_danxuan += item.num_danxuan
    	check_duoxuan += item.num_duoxuan
    	check_panduan += item.num_panduan
    	if(check_danxuan>danxuan_num){
    		console.log('danxuan超过咯')
    		let chaoguo = check_danxuan - danxuan_num
    		if(item.percent != 0){
    			item.num_danxuan = item.num_danxuan - chaoguo
    			if(item.num_danxuan < 0){
    				item.num_danxuan = 0
    			}
    		}
    		console.log('单选超过多少---->',chaoguo)
    	}
    	if(check_duoxuan>duoxuan_num){
    		console.log('duoxuan超过咯')
    		let chaoguo = check_duoxuan - duoxuan_num
    		if(item.percent != 0){
    			item.num_duoxuan = item.num_duoxuan - chaoguo
    			if(item.num_duoxuan < 0){
    				item.num_duoxuan = 0
    			}
    		}
    		console.log('多选超过多少---->',chaoguo)
    	}
    	if(check_panduan>panduan_num){
    		console.log('panduan超过咯')
    		let chaoguo = check_panduan - panduan_num
    		if(item.percent != 0){
    			item.num_panduan = item.num_panduan - chaoguo
    			if(item.num_panduan < 0){
    				item.num_panduan = 0
    			}
    		}
    		console.log('判断超过多少---->',chaoguo)
    	}
    })
    if(check_panduan < panduan_num){
    	console.log('判断题数不够')
    	let queshao = panduan_num - check_panduan
    		tem_arr[0].num_panduan = tem_arr[0].num_panduan + queshao
    		console.log('判断缺少多少---->',queshao)
    }
    if(check_danxuan<danxuan_num){
    	console.log('danxuan还缺少咯')
    	let queshao = danxuan_num - check_danxuan
    	tem_arr[0].num_danxuan = tem_arr[0].num_danxuan + queshao
    	console.log('单选缺少多少---->',queshao)
    }
    if(check_duoxuan<duoxuan_num){
    	console.log('duoxuan还缺少咯')
    	let queshao = duoxuan_num - check_duoxuan
    	tem_arr[0].num_duoxuan = tem_arr[0].num_duoxuan + queshao
    	console.log('多选缺少多少---->',queshao)
    }

    console.log('tem_arr-->',tem_arr)

    let sjsz_id = 1
    let search = sjsz.find({},{'id':1})
		search.sort({'id':-1})
		search.limit(1)
		search.exec(function(err,doc){
			if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err,stack})
			}
			if(doc && doc.length != 0){
				sjsz_id = doc[0].id + 1
			}

			let new_sjsz = new sjsz({
				id : sjsz_id,
		    	ksname : req.body.ksname,
		        ksriqi : req.body.ksriqi,
		        ksshijian : req.body.ksshijian,
		        danxuan_fenzhi : req.body.danxuan_fenzhi,
		        danxuan_num : req.body.danxuan_num,
		        duoxuan_fenzhi : req.body.duoxuan_fenzhi,
		        duoxuan_num : req.body.duoxuan_num,
		        panduan_fenzhi : req.body.panduan_fenzhi,
		        panduan_num : req.body.panduan_num,
		        per_of_modal : tem_arr,
		        kslianjie:baselink+randomStr,
		        randomStr:randomStr,
		        ckcs : ckcs
		    })
		    console.log('new_sjsz-->',new_sjsz)
			new_sjsz.save(function(err,docc){
				if(err){
					console.log('save err-->',err)
					return res.json({'code':-1,'msg':err})
				}
				let search = sjsz.find({ '_id' : { '$ne' : docc._id } })
				search.exec(function(err,doc){
	   				if(err){
	   					console.log('sjsz find dangqian!=0 err---->',err)
	   					return res.json({'code':-1,'msg':err})
	   				}
	   				console.log('doc length ---->',doc.length)
	   				async.eachLimit(doc,1,function(item,callback){
	   					sjsz.update({'_id':item._id},{'dangqian':0},function(e){
	   						if(e){
	   							console.log('sjsz eachLimit e ---->',e)
	   							return res.json({'code':1,'msg':e})
	   							callback(e)
	   						}
	   						console.log('sjsz eachLimit success ')
	   						callback()
	   					})
	   				},function(error){
	   					if(error){
	   						console.log('sjsz eachLimit error---->',error)
	   						return res.json({'code':-1,'msg':error})
	   					}
	   					console.log('sjsz eachLimit success')
	   					return res.json({'code':0,'msg':'设置成功'})
	   				})
	   			})
				//return res.json({'code':0,'msg':'设置成功'})
			})
		})
}).post('/new_step',function(req,res){
	console.log('in new_step post router')
	let ksname = req.body.ksname,
        ksriqi = req.body.ksriqi,
        ksshijian = req.body.ksshijian,
        danxuan_fenzhi = req.body.danxuan_fenzhi,
        danxuan_num = req.body.danxuan_num,
        duoxuan_fenzhi = req.body.duoxuan_fenzhi,
        duoxuan_num = req.body.duoxuan_num,
        panduan_fenzhi = req.body.panduan_fenzhi,
        panduan_num = req.body.panduan_num,
        per_of_modal = req.body.modal_arr,
        ckcs = req.body.ckcs ? req.body.ckcs : 3,
        sjfs = req.body.sjfs
    console.log('ckcs-->',ckcs)
    console.log('per_of_modal-->',JSON.parse(per_of_modal))
    //console.log('req.body-->',req.body)
    //console.log('req.body-->',JSON.parse(req.body))
    //return false
    let temp_timeStamp = moment().format('X'),
		temp_num = temp_timeStamp.substring(6),
		temp_randomStr = random_str(),
		randomStr = temp_num + temp_randomStr

    let tem_arr = [],
    	fuck = JSON.parse(per_of_modal)

    fuck.forEach(function(item,index){
    	let temp_per_of_modal = {}
    	console.log('item-->',item)
    	temp_per_of_modal.id = item.id
    	temp_per_of_modal.name = item.name
    	temp_per_of_modal.percent =0//都设为0
    	//计算各模块对应题型的抽取数量
    	//temp_per_of_modal.num_danxuan = Math.round(danxuan_num*item.percent/100)
    	//temp_per_of_modal.num_duoxuan = Math.round(duoxuan_num*item.percent/100)
    	//temp_per_of_modal.num_panduan = Math.round(panduan_num*item.percent/100)
    	temp_per_of_modal.num_danxuan = item.danxuan
    	temp_per_of_modal.num_duoxuan = item.duoxuan
    	temp_per_of_modal.num_panduan = item.panduan
    	temp_per_of_modal.mokuaizongfen = item.mokuaizongfen
    	tem_arr.push(temp_per_of_modal)
    	delete temp_per_of_modal
    	//console.log('tem_arr-->',tem_arr)
    })
    let check_danxuan = 0,
    	check_duoxuan = 0,
    	check_panduan = 0
    console.log('tem_arr',tem_arr)
    console.log()
    console.log()

    //console.log('tem_arr-->',tem_arr)

    let sjsz_id = 1
    let search = sjsz.find({},{'id':1})
		search.sort({'id':-1})
		search.limit(1)
		search.exec(function(err,doc){
			if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err,stack})
			}
			if(doc && doc.length != 0){
				sjsz_id = doc[0].id + 1
			}

			let new_sjsz = new sjsz({
				id : sjsz_id,
		    	ksname : req.body.ksname,
		        ksriqi : req.body.ksriqi,
		        ksshijian : req.body.ksshijian,
		        danxuan_fenzhi : req.body.danxuan_fenzhi,
		        danxuan_num : req.body.danxuan_num,
		        duoxuan_fenzhi : req.body.duoxuan_fenzhi,
		        duoxuan_num : req.body.duoxuan_num,
		        panduan_fenzhi : req.body.panduan_fenzhi,
		        panduan_num : req.body.panduan_num,
		        per_of_modal : tem_arr,
		        kslianjie:baselink+randomStr,
		        randomStr:randomStr,
		        ckcs : ckcs,
		        sjfs: sjfs
		    })
		    console.log('new_sjsz-->',new_sjsz)
			new_sjsz.save(function(err,docc){
				if(err){
					console.log('save err-->',err)
					return res.json({'code':-1,'msg':err})
				}
				let search = sjsz.find({ '_id' : { '$ne' : docc._id } })
				search.exec(function(err,doc){
	   				if(err){
	   					console.log('sjsz find dangqian!=0 err---->',err)
	   					return res.json({'code':-1,'msg':err})
	   				}
	   				console.log('doc length ---->',doc.length)
	   				async.eachLimit(doc,1,function(item,callback){
	   					sjsz.update({'_id':item._id},{'dangqian':0},function(e){
	   						if(e){
	   							console.log('sjsz eachLimit e ---->',e)
	   							return res.json({'code':1,'msg':e})
	   							callback(e)
	   						}
	   						console.log('sjsz eachLimit success ')
	   						callback()
	   					})
	   				},function(error){
	   					if(error){
	   						console.log('sjsz eachLimit error---->',error)
	   						return res.json({'code':-1,'msg':error})
	   					}
	   					console.log('sjsz eachLimit success')
	   					//生成试卷
	   					request('http://qiandao.szu.edu.cn:81/dxxxhjs/front/newexam?_id='+docc._id,function(error,response,body){
	   						if(error){
	   							console.log('editsj 生成试卷错误')
	   						}
	   						console.log('editsj 生成试卷成功')
	   						//console.log('response---->',response)
	   						//console.log('body---->',body)
	   					})
	   					return res.json({'code':0,'msg':'设置成功'})
	   				})
	   			})
				//return res.json({'code':0,'msg':'设置成功'})
			})
		})
})
//去掉空格
function trim_str(str){
	//过滤内容中的引号 json解析会出问题
	let s1 = str.replace(/\s|\xA0/g,""); 
	let s2 = s1.toString().replace(new RegExp('(["\"])', 'g'),"\\\""); 
    return s2 
}
router.get('/tktj',function(req,res){
	console.log('in tktj router')
	//题库提醒所属模块比例及数量
	//返回题库模块，题目类型
	let mokuai = [],
		res_cat = [],
		timu_type = [],
		res_timu = []
	async.waterfall([
		function(cb){
			let search = cat.distinct('catname',function(err,docs){
				if(err){
					console.log('search err-->',err)
					return res.json({'code':-1,'msg':err.stack})
				}
				else{
					res_cat = docs
					let temp_obj = {},
						temp_arr = []
					async.eachLimit(docs,3,function(item,callback){
						let search1 = cat.count({'catname':item},function(er,count){
							if(er){
								console.log('eachLimit er -->',er)
								callback(er)
							}
							else{
								console.log('check item && count --->',item,count)
								temp_obj.name = item
								temp_obj.value = count
								mokuai.push(temp_obj)
								temp_obj = {}
								callback()
							}
						})
					},function(err){
						console.log('eachLimit catname done && check mokuai--->',mokuai,docs)
						cb()
					})
				}
			})
		},
		//题目类型
		
		function(cb){
			let search = cat.distinct('leixing',function(err,docs){
				if(err){
					console.log('search leixing err-->',err)
					cb(err)
				}
				else{
					timu_type = docs
					let temp_obj = {}
					async.eachLimit(docs,3,function(item,callback){
						let search1 = cat.count({'leixing':item},function(er,count){
							if(er){
								console.log('eachLimit er-->',er)
								callback(er)
							}else{
								console.log('check item && count -->',item,count)
								temp_obj.value = count
								temp_obj.name = item
								res_timu.push(temp_obj)
								temp_obj = {}
								callback()
							}
						})
					},function(er){
						if(er){
							console.log('eachLimit er-->',er)
							cb(er)
						}
						else{
							console.log('eachLimit timu_type done && check timu_type--->',timu_type,res_timu)
							cb()
						}
					})
				}
			})
		}
	],function(error,result){
		if(error){
			console.log('async waterfall err-->',error)
			return res.json({'code':-1,'msg':error})
		}else{
			console.log('dddd')
			let temp_result = {}
				temp_result.mokuai = mokuai
				temp_result.res_cat = res_cat
				temp_result.timu_type = timu_type
				temp_result.res_timu = res_timu
			console.log(temp_result)
			return res.render('manage/tktj',{'result':temp_result})
		}
	})
})

router.get('/kscj',function(req,res){
	console.log('in kscj router')
	//返回题库模块，题目类型
	let search = stu_exam.distinct('ksname',function(err,docs){
		if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err.stack})
			}
			console.log('docs-->',docs)
			return res.render('manage/kscj',{'catname':docs})
	})
	// console.log('kscj')
	// res.render('manage/kscj')
})

router.get('/cjtj',function(req,res){
	console.log('in cjtj router')
	console.log('---------------cjtj')
		//返回题库模块，题目类型
	let search = stu_exam.distinct('ksname',function(err,docs){
		if(err){
				console.log('search err-->',err)
				return res.json({'code':-1,'msg':err.stack})
			}
			console.log('docs-->',docs)
			return res.render('manage/cjtj',{'catname':docs})
	})

})
//成绩统计图表
router.post('/cjtj_data',function(req,res){
	console.log('in cjtj_data router')
	let ksname = req.body.ksname
	let nameArr = ['60分以下','60-69分','70-79分','80-89分','90-100分']
	let dataArr = [],tempobj={}
	async.waterfall([
		function(cb){
			let search = stu_exam.find({})
				search.where('ksname').equals(ksname)
				search.where('zongfen').lt(60)
				search.count()
				search.exec(function(err,count){
					if(err){
						console.log('60-----err',err)
						return res.json({'code':-1,'msg':err})
					}
					console.log('60----->',count)
					tempobj.name = '60分以下'
					tempobj.value = count
					dataArr.push(tempobj)
					tempobj = {}
					cb()
				})
		},
		function(cb){
			let search = stu_exam.find({})
				search.where('ksname').equals(ksname)
				search.where('zongfen').lte(69)
				search.where('zongfen').gte(60)
				search.count()
				search.exec(function(err,count){
					if(err){
						console.log('60-----err',err)
						cb(err)
					}
					console.log('60-69----->',count)
					tempobj.name = '60-69'
					tempobj.value = count
					dataArr.push(tempobj)
					tempobj = {}
					cb()
				})
		},
		function(cb){
			let search = stu_exam.find({})
				search.where('ksname').equals(ksname)
				search.where('zongfen').lte(79)
				search.where('zongfen').gte(70)
				search.count()
				search.exec(function(err,count){
					if(err){
						console.log('60-----err',err)
						cb(err)
					}
					console.log('70-79----->',count)
					tempobj.name = '70-79'
					tempobj.value = count
					dataArr.push(tempobj)
					tempobj = {}
					cb()
				})
		},
		function(cb){
			let search = stu_exam.find({})
				search.where('ksname').equals(ksname)
				search.where('zongfen').lte(89)
				search.where('zongfen').gte(80)
				search.count()
				search.exec(function(err,count){
					if(err){
						console.log('60-----err',err)
						cb(err)
					}
					console.log('80-89----->',count)
					tempobj.name = '80-89'
					tempobj.value = count
					dataArr.push(tempobj)
					tempobj = {}
					cb()
				})
		},
		function(cb){
			let search = stu_exam.find({})
				search.where('ksname').equals(ksname)
				search.where('zongfen').lte(100)
				search.where('zongfen').gte(90)
				search.count()
				search.exec(function(err,count){
					if(err){
						console.log('60-----err',err)
						cb(err)
					}
					console.log('90-100----->',count)
					tempobj.name = '90-100'
					tempobj.value = count
					dataArr.push(tempobj)
					tempobj = {}
					cb()
				})
		}
	],function(error,result){
		if(error){
			console.log('async error',error)
			return res.json({'code':-1,'msg':error})
		}
		console.log('dataArr--->',dataArr)
		return res.json({'code':0,'nameArr':nameArr,'dataArr':dataArr})
	})
	
})
router.post('/editsj',function(req,res){
	console.log('in editsj router')
	let _id = req.body._id,
		ksname = req.body.ksname,
        //ksriqi = req.body.ksriqi,
        ksshijian = req.body.ksshijian,
        danxuan_fenzhi = req.body.danxuan_fenzhi,
        danxuan_num = req.body.danxuan_num,
        duoxuan_fenzhi = req.body.duoxuan_fenzhi,
        duoxuan_num = req.body.duoxuan_num,
        panduan_fenzhi = req.body.panduan_fenzhi,
        panduan_num = req.body.panduan_num,
        per_of_modal = req.body.modal_arr,
        ckcs = req.body.ckcs ? req.body.ckcs : 3,
        youxiao = req.body.youxiao,
        dangqian = req.body.dangqian,
        sjfs = req.body.sjfs
    

    let tem_arr = [],
    	fuck = JSON.parse(per_of_modal)

    fuck.forEach(function(item,index){
    	let temp_per_of_modal = {}
    	console.log('item-->',item)
    	temp_per_of_modal.id = item.id
    	temp_per_of_modal.name = item.name
    	temp_per_of_modal.percent = 0
    	//计算各模块对应题型的抽取数量
    	temp_per_of_modal.num_danxuan = item.danxuan
    	temp_per_of_modal.num_duoxuan = item.duoxuan
    	temp_per_of_modal.num_panduan = item.panduan
    	temp_per_of_modal.mokuaizongfen = item.mokuaizongfen
    	tem_arr.push(temp_per_of_modal)
    	delete temp_per_of_modal
    	//console.log('tem_arr-->',tem_arr)
    })

    //console.log('tem_arr-->',tem_arr)
    //console.log(_id,dangqian,youxiao)
   sjsz.update({'_id':_id},{'sjfs':sjfs,'dangqian':dangqian,'youxiao':youxiao,'ksname':ksname,'ksshijian':ksshijian,'danxuan_fenzhi':danxuan_fenzhi,'danxuan_num':danxuan_num,'duoxuan_fenzhi':duoxuan_fenzhi,'duoxuan_num':duoxuan_num,'panduan_fenzhi':panduan_fenzhi,'panduan_num':panduan_num,'per_of_modal':tem_arr,'ckcs':ckcs},function(err){
	   	if(err){
	   		console.log('update sjsz err-->',err)
	   		return res.json({'code':-1,'msg':err})
	   	}
	   	if(dangqian == 1){
	   		//只能有唯一一个当前考试，其它的置0
	   		console.log('dangqian is 1')
	   		let search = sjsz.find({ '_id' : { '$ne' : _id } })
	   			search.exec(function(err,doc){
	   				if(err){
	   					console.log('sjsz find dangqian!=0 err---->',err)
	   					return res.json({'code':-1,'msg':err})
	   				}
	   				console.log('doc length ---->',doc.length)
	   				async.eachLimit(doc,1,function(item,callback){
	   					sjsz.update({'_id':item._id},{'dangqian':0},function(e){
	   						if(e){
	   							console.log('sjsz eachLimit e ---->',e)
	   							return res.json({'code':1,'msg':e})
	   							callback(e)
	   						}
	   						console.log('sjsz eachLimit success ')
	   						callback()
	   					})
	   				},function(error){
	   					if(error){
	   						console.log('sjsz eachLimit error---->',error)
	   						return res.json({'code':-1,'msg':error})
	   					}
	   					console.log('sjsz eachLimit success')
	   					//在这里生成试卷
	   					request('http://qiandao.szu.edu.cn:81/dxxxhjs/front/newexam?_id='+_id,function(error,response,body){
	   						if(error){
	   							console.log('editsj 生成试卷错误')
	   						}
	   						console.log('editsj 生成试卷成功')
	   						//console.log('response---->',response)
	   						//console.log('body---->',body)
	   					})
	   					return res.json({'code':0,'msg':'修改成功！'})
	   				})
	   			})
	   	}
	   	if(dangqian!=1){
	   		console.log('dangqian 不是000000000')
	   		return res.json({'code':0,'msg':'修改成功！'})
	   	}
	   	
   })

})
module.exports = router;
