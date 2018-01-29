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
			console.log('计时开始')
			console.time('countdown')
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
				let why_num = parseInt(item.num_danxuan)
				console.log('check why_num---->',why_num)
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('单选')
					search.where('random').gte(random)
					search.limit(why_num)
					search.exec(function(e,d){
						if(e){
							console.log('第一次forEach err-->',e)
							return res.json({'code':-1,'msg':err.message})
						}
						console.log('第一次forEach docs-->',d.length)
						console.log('第一次 单选 num-->',item.num_danxuan)
						if(why_num){
							danxuan_arr.push(d)
						}else{
							danxuan_arr.push([])
						}

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
				let why_num = parseInt(item.num_duoxuan)
				console.log('check why_num---->',why_num)
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('多选')
					search.where('random').gte(random)
					search.limit(why_num)
					search.exec(function(e,d){
						if(e){
							console.log('第二次forEach err-->',e)
							return res.json({'code':-1,'msg':e.message})
						}
						console.log('第二次forEach docs-->',d.length)
						console.log('第二次 多选 num-->',item.num_duoxuan)
						if(why_num){
							duoxuan_arr.push(d)
						}else{
							duoxuan_arr.push([])
						}
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
			random = 20
			console.log('random 3-->',random)
			doc.per_of_modal.forEach(function(item,index){
				let why_num = parseInt(item.num_panduan)
				console.log('check why_num---->',why_num)
				let search = cat.find({})
					search.where('catname').equals(item.name)
					search.where('leixing').equals('判断')
					search.where('random').lte(random)
					search.limit(why_num)
					search.exec(function(e,d){
						if(e){
							console.log('第三次forEach err-->',e)
							return res.json({'code':-1,'msg':err.message})
						}
						console.log('第三次forEach docs-->',d.length)
						console.log('第三次 判断 num-->',item.num_panduan)
						console.log('第三次 判断 catname-->',item.name)
						if(why_num){
							panduan_arr.push(d)
						}else{
							panduan_arr.push([])
						}
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
			//题目已经是乱序取出的了，剩下答案乱序
			console.log('单选-->',danxuan_arr)
			console.log('多选-->',duoxuan_arr)
			console.log('判断-->',panduan_arr)
			//保存到数据库
			//返回前端乱序吧
			let res_danxuan_arr = [],
				res_duoxuan_arr = [],
				res_panduan_arr = []
			let num_of_danxuan = 0,//danxuan_arr中题目数量，用来跳出循环
				num_of_duoxuan = 0,
				num_of_panduan = 0
			async.waterfall([
				function(cbb){
					danxuan_arr.forEach(function(item,index){
						if(item.length!=0){
							num_of_danxuan += item.length
						}
						if((index+1) == danxuan_arr.length){
							console.log('num_of_danxuan---->',num_of_danxuan)
							cbb()
						}
					})
				},
				function(cbb){
					duoxuan_arr.forEach(function(item,index){
						if(item.length!=0){
							num_of_duoxuan += item.length
						}
						if((index+1) == duoxuan_arr.length){
							console.log('num_of_duoxuan---->',num_of_duoxuan)
							cbb()
						}
					})
				},
				function(cbb){
					panduan_arr.forEach(function(item,index){
						if(item.length!=0){
							num_of_panduan += item.length
						}
						if((index+1) == panduan_arr.length){
							console.log('num_of_panduan---->',num_of_panduan)
							cbb()
						}
					})
				},
				function(cbb){
					danxuan_arr.forEach(function(item,index){
						if(item.length!=0){
							item.forEach(function(it,ind){
								console.log('it.xuanxiang---->单选',ind,it.xuanxiang)
								it.xuanxiang = it.xuanxiang.sort(randomsort)
								console.log('单选答案乱序it.xuanxiang---->',it.xuanxiang)
								res_danxuan_arr.push(it)
							})
						}
						if(res_danxuan_arr.length == num_of_danxuan){
							console.log('res_danxuan_arr---->',res_danxuan_arr,res_danxuan_arr.length)
							cbb(null)
						}
					})
				},
				function(cbb){
					duoxuan_arr.forEach(function(item,index){
						if(item.length!=0){
							item.forEach(function(it,ind){
								console.log('it.xuanxiang---->多选',ind,it.xuanxiang)
								it.xuanxiang = it.xuanxiang.sort(randomsort)
								console.log('多选答案乱序it.xuanxiang---->',it.xuanxiang)
								res_duoxuan_arr.push(it)
							})
						}
						if(res_duoxuan_arr.length == num_of_duoxuan){
							console.log('res_duoxuan_arr---->',res_duoxuan_arr,res_duoxuan_arr.length)
							cbb(null)
						}
					})
				},
				function(cbb){
					panduan_arr.forEach(function(item,index){
						if(item.length!=0){
							item.forEach(function(it,ind){
								console.log('it.xuanxiang---->判断',ind,it.xuanxiang)
								it.xuanxiang = it.xuanxiang.sort(randomsort)
								console.log('判断答案乱序it.xuanxiang---->',it.xuanxiang)
								res_panduan_arr.push(it)
							})
						}
						if(res_panduan_arr.length == num_of_panduan){
							console.log('res_panduan_arr---->',res_panduan_arr,res_panduan_arr.length)
							cbb(null)
						}
					})
				}
			],function(err,result){
				if(err){
					console.log('组成结果时async出错')
					console.log(err)
					cb(err)
				}
				console.log('a最终返回结果-->',res_danxuan_arr,res_duoxuan_arr,res_panduan_arr)
				let back = {}
					back.res_danxuan_arr = res_danxuan_arr,
					back.res_duoxuan_arr = res_duoxuan_arr,
					back.res_panduan_arr = res_panduan_arr
				console.log('check back-->',back)
				cb(null,back)
			})
		}
	],function(err,result){
		if(err){
			console.log('async err-->',err)
			return res.json({'code':-1,'msg':err.message})
		}
		console.timeEnd('countdown')
		//return res.render('front/ks')
		return res.json({'code':-0,'msg':result})
	})
})
function randomsort(a, b) {
   return Math.random()>.5 ? -1 : 1; //通过随机产生0到1的数，然后判断是否大于0.5从而影响排序，产生随机性的效果。
}
router.get('/test',function(req,res){
	let search = cat.find({})
		search.where('catname').equals('党史')
		search.where('leixing').equals('判断')
		search.where('random').gte(20)
		search.exec(function(err,doc){
			console.log('doc length',doc.length)
		})
	// for(let i=0;i<100;i++){
	// 	console.log(Math.round((Math.random()) *50))
	// }
	res.render('front/test')
})
module.exports = router;
