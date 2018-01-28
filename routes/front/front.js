var express = require('express');
var router = express.Router();
const sjsz = require('../../db/cat').sjsz
const cat = require('../../db/cat').catinfo
const moment = require('moment')
const async = require('async')
/*
//code:{-1:数据库出错或其它错误，-2：结果为空，-3：考试日期已过，-4：考试尚未开始，-5：url有误}
 */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/ks',function(req,res){
	let randomStr = req.query.code
	console.log('check randomStr-->',randomStr)
	if(!randomStr){
		return res.json({'code':-5,'msg':'url有误'})
	}
	let search_data = [],//该数组为将从数据库取数据的参数[{模块名,题型,条数}]
		danxuan_arr = [],
		duoxuan_arr = [],
		panduan_arr = [],
		random = parseInt((Math.random()+0.01) * 50)
		if(random > 35 || random < 15){
			random = 25
		}
	//1.该考试是否存在，存在时是否已经过了日期
	async.waterfall([
		function(cb){
			let search = sjsz.findOne({})
				search.where('randomStr').equals(randomStr)
				search.exec(function(err,doc){
					if(err){
						console.log('search err',err)
						return res.json({'code':-1,'msg':err.message})
					}
					if(doc){
						console.log('check doc-->',doc)
						console.log('check doc.ksriqi-->',doc.ksriqi)
						console.log('check nowday-->',moment().format('YYYY-MM-DD'))
						if(moment(doc.ksriqi).isBefore(moment().format('YYYY-MM-DD'))){
							console.log('考试日期已过')
							return res.json({'code':-3,'msg':'考试日期已过'})
						}else if(moment(doc.ksriqi).isSame(moment().format('YYYY-MM-DD'))){
							console.log('考试日期有效')
							cb(null,doc)
						}else{
							console.log('考试尚未开始')
							return res.json({'code':-4,'msg':'考试尚未开始'})
						}
					}
					if(!doc){
						console.log('不存在该randomStr')
						return res.json({'code':-2,'msg':'没有对应的考试'})
					}
				})
		},
		function(doc,cb){//第一次循环找单选题
			doc.per_of_modal.forEach(function(item,index){
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('单选')
					search.where('random').gte(random)
					search.limit(item.num_danxuan)
					search.exec(function(e,d){
						if(e){
							console.log('第一次forEach err-->',e)
							return res.json({'code':-1,'msg':err.message})
						}
						console.log('第一次forEach docs-->',d.length)
						danxuan_arr.push(d)
						if(danxuan_arr.length == doc.per_of_modal.length){
							console.log('danxuan_arr-->',danxuan_arr,danxuan_arr.length)
							cb(null,doc)
						}
					})
			})
		},
		function(doc,cb){
			//第二次循环找多选题
			console.log('第二次循环')
			random = parseInt((Math.random()+0.01) * 50)
			if(random > 35 || random < 15){
				random = 25
			}
			console.log('random 2-->',random)
			doc.per_of_modal.forEach(function(item,index){
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('多选')
					search.where('random').gte(random)
					search.limit(item.num_duoxuan)
					search.exec(function(e,d){
						if(e){
							console.log('第二次forEach err-->',e)
							return res.json({'code':-1,'msg':err.message})
						}
						console.log('第二次forEach docs-->',d.length)
						duoxuan_arr.push(d)
						if(duoxuan_arr.length == doc.per_of_modal.length){
							console.log('duoxuan_arr-->',duoxuan_arr,duoxuan_arr.length)
							cb(null,doc)
						}
					})
			})
		},
		function(doc,cb){
			//第三次循环找判断题
			console.log('第三次循环找判断题')
			random = parseInt((Math.random()+0.01) * 50)
			if(random > 35 || random < 15){
				random = 25
			}
			console.log('random 3-->',random)
			doc.per_of_modal.forEach(function(item,index){
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('判断')
					search.where('random').gte(random)
					search.limit(item.num_panduan)
					search.exec(function(e,d){
						if(e){
							console.log('第三次forEach err-->',e)
							return res.json({'code':-1,'msg':err.message})
						}
						console.log('第三次forEach docs-->',d.length)
						console.log('第三次 判断 num-->',item.num_panduan)
						panduan_arr.push(d)
						if(panduan_arr.length == doc.per_of_modal.length){
							console.log('panduan_arr-->',panduan_arr,panduan_arr.length)
							console.log('找齐咯')
							cb(null)
						}
					})
			})
		},
		function(cb){
			console.log('check---->',danxuan_arr[0].length,danxuan_arr[1].length,danxuan_arr[2].length)
			console.log('check---->',duoxuan_arr[0].length,duoxuan_arr[1].length,duoxuan_arr[2].length)
			console.log('check---->',panduan_arr[0].length,panduan_arr[1].length,panduan_arr[2].length)
		}
	],function(err,result){
		if(err){
			console.log('async err-->',err)
			return res.json({'code':-1,'msg':err.message})
		}

	})
})
router.get('/test',function(req,res){
	res.render('front/test')
})
module.exports = router;
