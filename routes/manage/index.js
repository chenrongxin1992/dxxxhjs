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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('manage/index', { title: 'Express' });
});

router.get('/drtk',function(req,res){
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
		    //使用ejsExcel的getExcelArr将buffer读取为数组
		    ejsExcel.getExcelArr(exBuf).then(exlJson=>{
		    	console.log("---------------- read success:getExcelArr ----------------");
			    let workBook=exlJson;
			    let workSheets=workBook[0];//第一个工作表

			    let count = 0,//计数，排除第一行
			    	catid = 0;//cat id
			    let search = cat.find({},{'id':1})
			    	search.sort({'id':-1})
			    	search.limit(1)
			    	search.exec(function(err,docs){
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
										    obj_xuanxiang.content = item[4+i].trim()
										    arr_xuanxiang.push(obj_xuanxiang)
										    delete obj_xuanxiang
							    		}else{
							    			obj_xuanxiang.is_correct = false
							    			obj_xuanxiang.id = 4+i
										    obj_xuanxiang.content = item[4+i].trim()
										    arr_xuanxiang.push(obj_xuanxiang)
										    delete obj_xuanxiang
							    		}
						    		}
						    		console.log('check arr_xuanxiang-->',arr_xuanxiang)
						    		let	new_cat = new cat({
						    			id : catid,
						    			catname : item[0].trim(),
						    			leixing : item[1].trim(),
						    			timu : item[2].trim(),
						    			zqda : item[3].trim(),
						    			xuanxiang : arr_xuanxiang
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
										    	obj_xuanxiang.content = item[4+i].trim()
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}else{
							    				obj_xuanxiang.is_correct = false
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = item[4+i].trim()
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
							    			timu : item[2].trim(),
							    			zqda : item[3].trim(),
							    			xuanxiang : arr_xuanxiang
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
										    	obj_xuanxiang.content = item[4+i].trim()
										    	arr_xuanxiang.push(obj_xuanxiang)
										    	delete obj_xuanxiang
							    			}else{
							    				obj_xuanxiang.is_correct = false
							    				obj_xuanxiang.id = 4+i
										    	obj_xuanxiang.content = item[4+i].trim()
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
							    			timu : item[2].trim(),
							    			zqda : item[3].trim(),
							    			xuanxiang : arr_xuanxiang
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
	let page = req.query.page,
		limit = req.query.limit,
		timu = req.query.timu,
		catname = req.query.catname,
		leixing = req.query.leixing
	page ? page : 1;//当前页
	limit ? limit : 15;//每页数据
	timu ? timu : null
	catname ? catname : null
	leixing ? leixing : null
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
						//total = docs.length
						cb(null,docs,docs.length)
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
							console.log('check docs-->',docs)
							cb(null,docs,total)
					})
				}
		},
		function(docs,total,cb){
			//重新封装数据
			let data = []//最终数据
			docs.forEach(function(item,index){
				let tempdata = {}
				console.log('item-->',item)
				tempdata._id = item._id
				tempdata.catid = item.id
				tempdata.inused = item.inused
				tempdata.catname = item.catname
				tempdata.leixing = item.leixing
				tempdata.timu = item.timu
				tempdata.zqda = item.zqda
				item.xuanxiang.forEach(function(it,ind){
					console.log(it)
					tempdata['xuanxiang' + ind] = it.content +'(' + it.is_correct + ')'
					//tempdata['is_correct' + ind] = it.is_correct
					console.log(tempdata)
				})
				data.push(tempdata)
				delete tempdata
			})
			data.count = total
			console.log('返回数据-->',data)
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
router.post('/delete_item',function(req,res){
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

const baselink = 'localhost:3000/front/ks?code='
router.get('/sjsz',function(req,res){
	console.log('sjsz')
	res.render('manage/sjsz')
}).post('/sjsz',function(req,res){
	console.log('post sjsz')
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
				kslianjie:baselink+randomStr,
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
	let ksname = req.body.ksname,
        ksriqi = req.body.ksriqi,
        ksshijian = req.body.ksshijian,
        danxuan_fenzhi = req.body.danxuan_fenzhi,
        danxuan_num = req.body.danxuan_num,
        duoxuan_fenzhi = req.body.duoxuan_fenzhi,
        duoxuan_num = req.body.duoxuan_num,
        panduan_fenzhi = req.body.panduan_fenzhi,
        panduan_num = req.body.panduan_num,
        per_of_modal = req.body.modal_arr
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
    	temp_per_of_modal.name = item.name,
    	temp_per_of_modal.percent = item.percent
    	tem_arr.push(temp_per_of_modal)
    	delete temp_per_of_modal
    	console.log('tem_arr-->',tem_arr)
    })

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
		        kslianjie:baselink+randomStr
		    })
		    console.log('new_sjsz-->',new_sjsz)
			new_sjsz.save(function(err){
				if(err){
					console.log('save err-->',err)
					return res.json({'code':-1,'msg':err})
				}
				return res.json({'code':0,'msg':'设置成功'})
			})
		})
})

module.exports = router;
