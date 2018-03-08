var express = require('express');
var router = express.Router();
const sjsz = require('../../db/cat').sjsz
const cat = require('../../db/cat').catinfo
const stu_exam = require('../../db/cat').stu_exam
const moment = require('moment')
const async = require('async')
const request = require('request')

let MyServer = "http://116.13.96.53:81",
	//CASserver = "https://auth.szu.edu.cn/cas.aspx/",
	CASserver = 'https://authserver.szu.edu.cn/authserver/',
	ReturnURL = "http://116.13.96.53:81";


/*
//code:{-1:数据库出错或其它错误，-2：结果为空，-3：考试日期已过，-4：考试尚未开始，-5：url有误}
 */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

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
router.get('/ks',function(req,res){
	if(!req.query.ticket){
		let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
		console.log('ReturnURL url-->',ReturnURL)
		let url = CASserver + 'login?service=' + ReturnURL
		console.log('check redirecturl -->',url)
		console.log('跳转获取ticket')

		if(req.session.student){
			console.log('没有ticket,考生有session,直接返回试卷流程')
			console.log('session-->',req.session.student)
			let randomStr = req.query.code
			console.log('check randomStr-->',randomStr)
			if(!randomStr){
				return res.json({'code':-5,'msg':'url有误'})
			}
			let search_data = [],//该数组为将从数据库取数据的参数[{模块名,题型,条数}]
				danxuan_arr = [],
				duoxuan_arr = [],
				panduan_arr = [],
				ksinfo = {},
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
								//console.log('check doc-->',doc)
								console.log('check doc.ksriqi-->',doc.ksriqi)
								console.log('check nowday-->',moment().format('YYYY-MM-DD'))
								if(moment(doc.ksriqi).isBefore(moment().format('YYYY-MM-DD'))){
									let search_sj = stu_exam.findOne({})
										search_sj.where('randomStr').equals(randomStr)
										search_sj.where('gonghao').equals(req.session.student.alias)
										search_sj.sort({'kscs':-1})//找最后一条考试记录
			    						search_sj.limit(1)
										search_sj.exec(function(errr,docc){
											if(errr){
												console.log('search_sj errr')
												return resjson({'code':-1,'msg':err.message})
											}
											if(docc && docc.is_end == 0){
												console.log('考试日期已过')
												return res.render('front/kserror',{'code':-3,'msg':'考试日期已过'})
											}
											if(docc && docc.is_end == 1 && (docc.kscs==doc.ckcs)){//考试次数等于重考次数
												console.log('考试次数等于重考次数')
												let search = stu_exam.find({})
													search.where('gonghao').equals(req.session.user.alias)
													search.where('is_end').equals(1)
													search.exec(function(err,doc){
														if(err){
															console.log('err-->',err)
															return res.json({'code':-1,'msg':err})
														}
														if(doc){
															console.log('check doc-->',doc)
															return res.render('front/myexamlist', { 'user': req.session.student,'examinfo':doc });
														}
														if(!doc){
															return res.json({'code':-1,'msg':'暂无记录'})
														}
													})
												//return res.render('front/myexamlist',{'user':req.session.student})
												//return res.render('front/ksdonenew',{'result':docc,'ksinfo':doc})
											}
											if(docc && docc.is_end == 1 && (docc.kscs<doc.ckcs)){//考试次数等于重考次数
												console.log('考试次数小于重考次数')
												console.log('考试次数 && 重考次数--》',docc.kscs,doc.ckcs)
												//return res.render('front/finish')
												return res.render('front/ksdonenew',{'result':docc,'ksinfo':doc})
											}
											if(!docc){
												console.log('考试日期已过,你没有参与该考试')
												return res.render('front/kserror',{'code':-3,'msg':'考试日期已过，你没有参与该考试'})
											}
										})
								}else if(moment(doc.ksriqi).isSame(moment().format('YYYY-MM-DD'))){
									console.log('考试日期有效')
									//这里要查是否已经开考，如果已经开考，则返回试卷，否则先找出该人最新的试卷id+1，并往下走
									ksinfo = doc
									//看是否已有试卷，有的话直接返回
									console.log('4546465465464')
									let search_sj = stu_exam.findOne({})
										search_sj.where('randomStr').equals(randomStr)
										search_sj.where('gonghao').equals(req.session.student.alias)//这里替换成session中的alias
										//search_sj.where('is_end').equals(0)
										search_sj.sort({'kscs':-1})//找最后一条考试记录
			    						search_sj.limit(1)
										search_sj.exec(function(errr,docc){
											if(errr){
												console.log('search_sj errr')
												return resjson({'code':-1,'msg':err.message})
											}
											if(docc && docc.is_end == 0 && (docc.kscs<=ksinfo.ckcs)){
												//console.log('docc---->',docc)
												console.log('试卷存在，尚未结束，直接返回试卷继续')
												console.log('考试次数 && 重考次数--》',docc.kscs,doc.ckcs)
												return res.render('front/ks',{'code':0,'result':docc,'ksinfo':ksinfo})
											}
											if(docc && docc.is_end == 1 && (docc.kscs==ksinfo.ckcs)){
												console.log('该试卷已经提交')
												console.log('重考次数已用完')
												let search = stu_exam.find({})
													search.where('gonghao').equals(req.session.user.alias)
													search.where('is_end').equals(1)
													search.exec(function(err,doc){
														if(err){
															console.log('err-->',err)
															return res.json({'code':-1,'msg':err})
														}
														if(doc){
															console.log('check doc-->',doc)
															return res.render('front/myexamlist', { 'user': req.session.student,'examinfo':doc });
														}
														if(!doc){
															return res.json({'code':-1,'msg':'暂无记录'})
														}
													})
												//return res.render('front/myexamlist',{'user':req.session.student})
												//return res.render('front/ksdonenew',{'result':docc,'ksinfo':ksinfo})
											}
											if(!docc || (docc.kscs<ksinfo.ckcs)){
												console.log('考试日期有效，还没生成试卷')
												cb(null,doc)
											}
										})
								}else{
									console.log('考试尚未开始')
									return res.render('front/kserror',{'code':-4,'msg':'考试尚未开始'})
								}
							}
							if(!doc){
								console.log('不存在该randomStr')
								return res.render('front/kserror',{'code':-2,'msg':'没有对应的考试'})
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
								if(d.length < item.num_danxuan){
									console.log('-------单选题 随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('单选')
										search1.where('random').gte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
								}else{
									if(why_num){
										danxuan_arr.push(d)
									}else{
										danxuan_arr.push([])
									}

									if(danxuan_arr.length == doc.per_of_modal.length){
										console.log('danxuan_arr-->',danxuan_arr,danxuan_arr.length)
										cb(null,doc)
									}
								}
							})//search
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
								//
								if(d.length < item.num_duoxuan){
									console.log('-------多选题 随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('多选')
										search1.where('random').lte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
												//console.log('duoxuan_arr-->',duoxuan_arr,duoxuan_arr.length)
												cb(null,doc)
											}
										})
								}else{
									if(why_num){
										duoxuan_arr.push(d)
									}else{
										duoxuan_arr.push([])
									}
									if(duoxuan_arr.length == doc.per_of_modal.length){
										//console.log('duoxuan_arr-->',duoxuan_arr,duoxuan_arr.length)
										cb(null,doc)
									}
								}
							})//search
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
								if(d.length < item.num_panduan){
									console.log('-------随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('判断')
										search1.where('random').gte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
												//console.log('panduan_arr-->',panduan_arr,panduan_arr.length)
												console.log('找齐咯')
												cb(null)
											}
										})//seach
								}else{
									if(why_num){
										panduan_arr.push(d)
									}else{
										panduan_arr.push([])
									}
									if(panduan_arr.length == doc.per_of_modal.length){
										//console.log('panduan_arr-->',panduan_arr,panduan_arr.length)
										console.log('找齐咯')
										cb(null)
									}
								}
							})//seach
					})//foreach
				},
				function(cb){
					console.log('check---->',danxuan_arr[0].length,danxuan_arr[1].length,danxuan_arr[2].length)
					console.log('check---->',duoxuan_arr[0].length,duoxuan_arr[1].length,duoxuan_arr[2].length)
					console.log('check---->',panduan_arr[0].length,panduan_arr[1].length,panduan_arr[2].length)
					//题目已经是乱序取出的了，剩下答案乱序
					//console.log('单选-->',danxuan_arr)
					//console.log('多选-->',duoxuan_arr)
					//console.log('判断-->',panduan_arr)
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
										//console.log('it.xuanxiang---->单选',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('单选答案乱序it.xuanxiang---->',it.xuanxiang)
										res_danxuan_arr.push(it)
									})
								}
								if((res_danxuan_arr.length == num_of_danxuan) && ((index+1) == danxuan_arr.length)){
									//console.log('res_danxuan_arr---->',res_danxuan_arr,res_danxuan_arr.length)
									console.log('-------------单选乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							duoxuan_arr.forEach(function(item,index){
								if(item.length!=0){
									item.forEach(function(it,ind){
										//console.log('it.xuanxiang---->多选',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('多选答案乱序it.xuanxiang---->',it.xuanxiang)
										res_duoxuan_arr.push(it)
									})
								}
								if((res_duoxuan_arr.length == num_of_duoxuan) && ((index+1) == duoxuan_arr.length)){
									//console.log('res_duoxuan_arr---->',res_duoxuan_arr,res_duoxuan_arr.length)
									console.log('-------------多选乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							panduan_arr.forEach(function(item,index){
								if(item.length!=0){
									item.forEach(function(it,ind){
										//console.log('it.xuanxiang---->判断',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('判断答案乱序it.xuanxiang---->',it.xuanxiang)
										res_panduan_arr.push(it)
									})
								}
								if((res_panduan_arr.length == num_of_panduan) && ((index+1) == panduan_arr.length)){
									//console.log('res_panduan_arr---->',res_panduan_arr,res_panduan_arr.length)
									console.log('-------------判断乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							console.log('++++++++++++++++进来了没有++++++++++++++++')
							//增加一步，生成qstr
							let temp_danxuan_str = '',
			                    temp_duoxuan_str = '',
			                    temp_panduan_str = '',
			                    danxuan_num = parseInt(res_danxuan_arr.length),
			                    duoxuan_num = parseInt(res_duoxuan_arr.length),
			                    panduan_num = parseInt(res_panduan_arr.length)
			                async.waterfall([
			                	function(cbbb){
			                		let count = 0
			                		res_danxuan_arr.forEach(function(item,index){
			                			temp_danxuan_str += '¤radio§' + (index+1) + '§1§false§false§§true§§§0§§'
			                			for(let i=0;i<item.xuanxiang.length;i++){
			                				temp_danxuan_str += '§false〒0〒0'
			                				if((index + 1 == res_danxuan_arr.length) && (i+1 == item.xuanxiang.length) ){
				                				console.log('单选循环结束')
					                   			//console.log('temp_danxuan_str-->',temp_danxuan_str)
					                   			cbbb()
				                			}
			                			}
			                		})
			                	},
			                	function(cbbb){
			                		//console.log('ddddddddddddddddddddddddddddddddddd')
			                		res_duoxuan_arr.forEach(function(ite,inde){
			                			temp_duoxuan_str += '¤check§' + parseInt((danxuan_num+inde+1)) + '§1§false§false§§true,,§§§0§§'
			                			//console.log('temp_duoxuan_str-->',temp_duoxuan_str)
			                			for(let i=0;i<ite.xuanxiang.length;i++){
			                				//console.log('ddddddddddddddddddddddddddddddddddd')
			                				temp_duoxuan_str += '§false〒0〒0〒'
			                				if((inde + 1 == res_duoxuan_arr.length) && (i+1 == ite.xuanxiang.length)){
				                				console.log('多选循环结束')
					                        	//console.log('temp_duoxuan_str-->',temp_duoxuan_str)
					                        	cbbb()
				                			}
			                			}
			                			
			                		})
			                	},
			                	function(cbbb){
			                		res_panduan_arr.forEach(function(it,ind){
			                			temp_panduan_str += '¤radio§' + parseInt(danxuan_num+duoxuan_num+ind+(1)) + '§1§false§false§§true§§§0§§'
			                			for(let i=0;i<it.xuanxiang.length;i++){
			                				temp_panduan_str += '§false〒0〒0'
			                				if((ind + 1 == res_panduan_arr.length) && (i+1 == it.xuanxiang.length)){
				                				console.log('判断循环结束')
								                //console.log('temp_panduan_str-->',temp_panduan_str)
								                cbbb()
				                			}
			                			}
			                			
			                		})
			                	}
			                ],function(error,result){
			                	qstr = 'false§false¤page§1§§§' + temp_danxuan_str + temp_duoxuan_str + temp_panduan_str
								//console.log('check qstr--->',qstr)
								cbb()
			                })
						}
					],function(err,result){
						if(err){
							console.log('组成结果时async出错')
							console.log(err)
							cb(err)
						}
						//console.log('a最终返回结果-->',res_danxuan_arr,res_duoxuan_arr,res_panduan_arr)
						let back = {}
							back.res_danxuan_arr = res_danxuan_arr,
							back.res_duoxuan_arr = res_duoxuan_arr,
							back.res_panduan_arr = res_panduan_arr,
							back.qstr = qstr
						//console.log('check back-->',back)
						//保存到数据库
						let search = stu_exam.findOne({'randomStr':ksinfo.randomStr})
							//search.where('_id').equals(ksinfo._id)
							search.sort({'kscs':-1})
							search.limit(1)
							search.exec(function(er,doc){
								if(er){
									console.log('er --->',er)
									cb(er)
								}else{
									//console.log('------------>',doc)
									if(doc){
										console.log('check kscs---->',doc.kscs)
										back.kscs = doc.kscs+1
										console.log('check back.kscs---->',back.kscs)
										let new_stu_exam = new stu_exam({
											qstr : qstr,
											gonghao : req.session.student.alias,//这里替换成session中的alias
											xingming : req.session.student.cn,//这里替换成session中的cn
											ksname : ksinfo.ksname,
											ksshijian : ksinfo.ksshijian,
											ksriqi : ksinfo.ksriqi,
											danxuan_num : ksinfo.danxuan_num,
											danxuan_fenzhi : ksinfo.danxuan_fenzhi,
											duoxuan_num : ksinfo.duoxuan_num,
											duoxuan_fenzhi : ksinfo.duoxuan_fenzhi,
											panduan_num : ksinfo.panduan_num,
											panduan_fenzhi : ksinfo.panduan_fenzhi,
											randomStr : ksinfo.randomStr,
											kslianjie : ksinfo.kslianjie,
											res_danxuan_arr : res_danxuan_arr,
											res_duoxuan_arr : res_duoxuan_arr,
											res_panduan_arr : res_panduan_arr,
											createTimeStamp : moment().format('X'),
											ckcs : ksinfo.ckcs,
											kscs : doc.kscs+1
										})
										new_stu_exam.save(function(err){
											if(err){
												console.log('new_stu_exam save err---->',err)
												cb(err)
											}else{
												cb(null,back)
											}
											
										})
									}else{
										console.log('第一次生成试卷---->')
										back.kscs = 1
										let new_stu_exam = new stu_exam({
											qstr : qstr,
											gonghao : req.session.student.alias,//这里替换成session中的alias
											xingming : req.session.student.cn,//这里替换成session中的cn
											ksname : ksinfo.ksname,
											ksshijian : ksinfo.ksshijian,
											ksriqi : ksinfo.ksriqi,
											danxuan_num : ksinfo.danxuan_num,
											danxuan_fenzhi : ksinfo.danxuan_fenzhi,
											duoxuan_num : ksinfo.duoxuan_num,
											duoxuan_fenzhi : ksinfo.duoxuan_fenzhi,
											panduan_num : ksinfo.panduan_num,
											panduan_fenzhi : ksinfo.panduan_fenzhi,
											randomStr : ksinfo.randomStr,
											kslianjie : ksinfo.kslianjie,
											res_danxuan_arr : res_danxuan_arr,
											res_duoxuan_arr : res_duoxuan_arr,
											res_panduan_arr : res_panduan_arr,
											createTimeStamp : moment().format('X'),
											ckcs : ksinfo.ckcs,
											kscs : 1
										})
										new_stu_exam.save(function(err){
											if(err){
												console.log('new_stu_exam save err---->',err)
												cb(err)
											}else{
												cb(null,back)
											}
											
										})
									}
								}//else
								
							})
					})
				}
			],function(err,result){
				if(err){
					console.log('async err-->',err)
					return res.json({'code':-1,'msg':err.message})
				}
				console.timeEnd('countdown')
				
				return res.render('front/ks',{'code':0,'result':result,'ksinfo':ksinfo})
				//return res.json({'code':-0,'msg':result})
			})
		}
		else{
			console.log('没有ticket，去获取ticket')
			return res.redirect(url)
		}
	}else{
		if(req.session.student){
			console.log('有ticket,也有session')
			console.log('session-->',req.session.student)
			let randomStr = req.query.code
			console.log('check randomStr-->',randomStr)
			if(!randomStr){
				return res.json({'code':-5,'msg':'url有误'})
			}
			let search_data = [],//该数组为将从数据库取数据的参数[{模块名,题型,条数}]
				danxuan_arr = [],
				duoxuan_arr = [],
				panduan_arr = [],
				ksinfo = {},
				qstr = ''
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
								//console.log('check doc-->',doc)
								console.log('check doc.ksriqi-->',doc.ksriqi)
								console.log('check nowday-->',moment().format('YYYY-MM-DD'))
								if(moment(doc.ksriqi).isBefore(moment().format('YYYY-MM-DD'))){
									let search_sj = stu_exam.findOne({})
										search_sj.where('randomStr').equals(randomStr)
										search_sj.sort({'kscs':-1})//找最后一条考试记录
										search_sj.limit(1)
										search_sj.exec(function(errr,docc){
											if(errr){
												console.log('search_sj errr')
												return resjson({'code':-1,'msg':err.message})
											}
											if(docc && docc.is_end == 0){
												console.log('考试日期已过')
												return res.render('front/kserror',{'code':-3,'msg':'考试日期已过'})
											}
											if(docc && docc.is_end == 1 && (docc.kscs==doc.ckcs)){//考试次数等于重考次数
												console.log('考试次数等于重考次数')
												let search = stu_exam.find({})
													search.where('gonghao').equals(req.session.user.alias)
													search.where('is_end').equals(1)
													search.exec(function(err,doc){
														if(err){
															console.log('err-->',err)
															return res.json({'code':-1,'msg':err})
														}
														if(doc){
															console.log('check doc-->',doc)
															return res.render('front/myexamlist', { 'user': req.session.student,'examinfo':doc });
														}
														if(!doc){
															return res.json({'code':-1,'msg':'暂无记录'})
														}
													})
												//return res.render('front/myexamlist',{'user':req.session.student})
												//return res.render('front/ksdonenew',{'result':docc,'ksinfo':doc})
											}
											if(docc && docc.is_end == 1 && (docc.kscs<doc.ckcs)){//考试次数等于重考次数
												console.log('考试次数小于重考次数')
												console.log('考试次数 && 重考次数--》',docc.kscs,doc.ckcs)
												//return res.render('front/finish')
												return res.render('front/ksdonenew',{'result':docc,'ksinfo':doc})
											}
											if(!docc){
												console.log('考试日期已过,你没有参与该考试')
												return res.render('front/kserror',{'code':-3,'msg':'考试日期已过，你没有参与该考试'})
											}
										})
								}else if(moment(doc.ksriqi).isSame(moment().format('YYYY-MM-DD'))){
									console.log('考试日期有效')
									//这里要查是否已经开考，如果已经开考，则返回试卷，否则先找出该人最新的试卷id+1，并往下走
									ksinfo = doc
									//看是否已有试卷，有的话直接返回
									console.log('99999999999999')
									let search_sj = stu_exam.findOne({})
										search_sj.where('randomStr').equals(randomStr)
										search_sj.where('gonghao').equals(req.session.student.alias)//这里替换成session中的alias
										search_sj.sort({'kscs':-1})//找最后一条考试记录
										search_sj.limit(1)
										//console.log('search_sj-->',search_sj)
										//search_sj.where('is_end').equals(0)
										search_sj.exec(function(errr,docc){
											if(errr){
												console.log('search_sj errr')
												return res.json({'code':-1,'msg':errr})
											}
											if(docc && docc.is_end == 0 && (docc.kscs<=ksinfo.ckcs)){
												//console.log('docc---->',docc)
												console.log('试卷存在，尚未结束，直接返回试卷继续')
												console.log('考试次数 && 重考次数--》',docc.kscs,doc.ckcs)
												return res.render('front/ks',{'code':0,'result':docc,'ksinfo':ksinfo})
											}
											if(docc && docc.is_end == 1 && (docc.kscs==ksinfo.ckcs)){
												console.log('该试卷已经提交')
												console.log('重考次数已用完')
												let search = stu_exam.find({})
													search.where('gonghao').equals(req.session.user.alias)
													search.where('is_end').equals(1)
													search.exec(function(err,doc){
														if(err){
															console.log('err-->',err)
															return res.json({'code':-1,'msg':err})
														}
														if(doc){
															console.log('check doc-->',doc)
															return res.render('front/myexamlist', { 'user': req.session.student,'examinfo':doc });
														}
														if(!doc){
															return res.json({'code':-1,'msg':'暂无记录'})
														}
													})
												//return res.render('front/myexamlist',{'user':req.session.student})
												//return res.render('front/ksdonenew',{'result':docc,'ksinfo':ksinfo})
											}
											if(!docc || (docc.kscs<ksinfo.ckcs)){
												console.log('考试日期有效，还没生成试卷')
												cb(null,doc)
											}
										})
								}else{
									console.log('考试尚未开始')
									return res.render('front/kserror',{'code':-4,'msg':'考试尚未开始'})
								}
							}
							if(!doc){
								console.log('不存在该randomStr')
								return res.render('front/kserror',{'code':-2,'msg':'没有对应的考试'})
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
								if(d.length < item.num_danxuan){
									console.log('-------单选题 随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('单选')
										search1.where('random').gte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
												//console.log('danxuan_arr-->',danxuan_arr,danxuan_arr.length)
												cb(null,doc)
											}
										})
								}else{
									if(why_num){
										danxuan_arr.push(d)
									}else{
										danxuan_arr.push([])
									}

									if(danxuan_arr.length == doc.per_of_modal.length){
										//console.log('danxuan_arr-->',danxuan_arr,danxuan_arr.length)
										cb(null,doc)
									}
								}
							})//search
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
								//
								if(d.length < item.num_duoxuan){
									console.log('-------多选题 随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('多选')
										search1.where('random').lte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
												//console.log('duoxuan_arr-->',duoxuan_arr,duoxuan_arr.length)
												cb(null,doc)
											}
										})
								}else{
									if(why_num){
										duoxuan_arr.push(d)
									}else{
										duoxuan_arr.push([])
									}
									if(duoxuan_arr.length == doc.per_of_modal.length){
										//console.log('duoxuan_arr-->',duoxuan_arr,duoxuan_arr.length)
										cb(null,doc)
									}
								}
							})//search
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
								if(d.length < item.num_panduan){
									console.log('-------随机抽取的结果少于题目数，重新抽取-------')
									let search1 = cat.find({})
										search1.where('catname').equals(item.name)
										search1.where('leixing').equals('判断')
										search1.where('random').gte(random)
										search1.limit(why_num)
										search1.exec(function(e,d){
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
												//console.log('panduan_arr-->',panduan_arr,panduan_arr.length)
												console.log('找齐咯')
												cb(null)
											}
										})//seach
								}else{
									if(why_num){
										panduan_arr.push(d)
									}else{
										panduan_arr.push([])
									}
									if(panduan_arr.length == doc.per_of_modal.length){
										//console.log('panduan_arr-->',panduan_arr,panduan_arr.length)
										console.log('找齐咯')
										cb(null)
									}
								}
							})//seach
					})//foreach
				},
				function(cb){
					console.log('check---->',danxuan_arr[0].length,danxuan_arr[1].length,danxuan_arr[2].length)
					console.log('check---->',duoxuan_arr[0].length,duoxuan_arr[1].length,duoxuan_arr[2].length)
					console.log('check---->',panduan_arr[0].length,panduan_arr[1].length,panduan_arr[2].length)
					//题目已经是乱序取出的了，剩下答案乱序
					//console.log('单选-->',danxuan_arr)
					//console.log('多选-->',duoxuan_arr)
					//console.log('判断-->',panduan_arr)
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
										//console.log('it.xuanxiang---->单选',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('单选答案乱序it.xuanxiang---->',it.xuanxiang)
										res_danxuan_arr.push(it)
									})
								}
								if((res_danxuan_arr.length == num_of_danxuan) && ((index+1) == danxuan_arr.length)){
									//console.log('res_danxuan_arr---->',res_danxuan_arr,res_danxuan_arr.length)
									console.log('-------------单选乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							duoxuan_arr.forEach(function(item,index){
								if(item.length!=0){
									item.forEach(function(it,ind){
										//console.log('it.xuanxiang---->多选',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('多选答案乱序it.xuanxiang---->',it.xuanxiang)
										res_duoxuan_arr.push(it)
									})
								}
								if((res_duoxuan_arr.length == num_of_duoxuan) && ((index+1) == duoxuan_arr.length)){
									//console.log('res_duoxuan_arr---->',res_duoxuan_arr,res_duoxuan_arr.length)
									console.log('-------------多选乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							panduan_arr.forEach(function(item,index){
								if(item.length!=0){
									item.forEach(function(it,ind){
										//console.log('it.xuanxiang---->判断',ind,it.xuanxiang)
										it.xuanxiang = it.xuanxiang.sort(randomsort)
										//console.log('判断答案乱序it.xuanxiang---->',it.xuanxiang)
										res_panduan_arr.push(it)
									})
								}
								if((res_panduan_arr.length == num_of_panduan) && ((index+1) == panduan_arr.length)){
									//console.log('res_panduan_arr---->',res_panduan_arr,res_panduan_arr.length)
									console.log('-------------判断乱序完成---------------')
									cbb(null)
								}
							})
						},
						function(cbb){
							console.log('++++++++++++++++进来了没有++++++++++++++++')
							//增加一步，生成qstr
							let temp_danxuan_str = '',
			                    temp_duoxuan_str = '',
			                    temp_panduan_str = ''
			                    danxuan_num = parseInt(res_danxuan_arr.length),
			                    duoxuan_num = parseInt(res_duoxuan_arr.length),
			                    panduan_num = parseInt(res_panduan_arr.length)
			                async.waterfall([
			                	function(cbbb){
			                		let count = 0
			                		res_danxuan_arr.forEach(function(item,index){
			                			temp_danxuan_str += '¤radio§' + (index+1) + '§1§false§false§§true§§§0§§'
			                			for(let i=0;i<item.xuanxiang.length;i++){
			                				temp_danxuan_str += '§false〒0〒0'
			                				if((index + 1 == res_danxuan_arr.length) && (i+1 == item.xuanxiang.length) ){
				                				console.log('单选循环结束')
					                   			//console.log('temp_danxuan_str-->',temp_danxuan_str)
					                   			cbbb()
				                			}
			                			}
			                		})
			                	},
			                	function(cbbb){
			                		//console.log('ddddddddddddddddddddddddddddddddddd')
			                		res_duoxuan_arr.forEach(function(ite,inde){
			                			temp_duoxuan_str += '¤check§' + parseInt((danxuan_num+inde+1)) + '§1§false§false§§true,,§§§0§§'
			                			//console.log('temp_duoxuan_str-->',temp_duoxuan_str)
			                			for(let i=0;i<ite.xuanxiang.length;i++){
			                				//console.log('ddddddddddddddddddddddddddddddddddd')
			                				temp_duoxuan_str += '§false〒0〒0〒'
			                				if((inde + 1 == res_duoxuan_arr.length) && (i+1 == ite.xuanxiang.length)){
				                				console.log('多选循环结束')
					                        	//console.log('temp_duoxuan_str-->',temp_duoxuan_str)
					                        	cbbb()
				                			}
			                			}
			                			
			                		})
			                	},
			                	function(cbbb){
			                		res_panduan_arr.forEach(function(it,ind){
			                			temp_panduan_str += '¤radio§' + parseInt(danxuan_num+duoxuan_num+ind+(1)) + '§1§false§false§§true§§§0§§'
			                			for(let i=0;i<it.xuanxiang.length;i++){
			                				temp_panduan_str += '§false〒0〒0'
			                				if((ind + 1 == res_panduan_arr.length) && (i+1 == it.xuanxiang.length)){
				                				console.log('判断循环结束')
								                //console.log('temp_panduan_str-->',temp_panduan_str)
								                cbbb()
				                			}
			                			}
			                			
			                		})
			                	}
			                ],function(error,result){
			                	qstr = 'false§false¤page§1§§§' + temp_danxuan_str + temp_duoxuan_str + temp_panduan_str
								//console.log('check qstr--->',qstr)
								cbb()
			                })
						}
					],function(err,result){
						if(err){
							console.log('组成结果时async出错')
							console.log(err)
							cb(err)
						}
						//console.log('a最终返回结果-->',res_danxuan_arr,res_duoxuan_arr,res_panduan_arr)
						let back = {}
							back.res_danxuan_arr = res_danxuan_arr,
							back.res_duoxuan_arr = res_duoxuan_arr,
							back.res_panduan_arr = res_panduan_arr,
							back.qstr = qstr
						//console.log('check back-->',back)
						//保存到数据库
						//console.log()
						let search = stu_exam.findOne({'randomStr':ksinfo.randomStr})
							//search.where('_id').equals()
							search.sort({'kscs':-1})
							search.limit(1)
							search.exec(function(er,doc){
								if(er){
									console.log('er --->',er)
									cb(er)
								}else{
									console.log('2------------>')
									if(doc){
										back.kscs = doc.kscs+1
										console.log('check kscs---->',doc.kscs)
										console.log('check back.kscs---->',back.kscs)
										let new_stu_exam = new stu_exam({
											qstr : qstr,
											gonghao : req.session.student.alias,//这里替换成session中的alias
											xingming : req.session.student.cn,//这里替换成session中的cn
											ksname : ksinfo.ksname,
											ksshijian : ksinfo.ksshijian,
											ksriqi : ksinfo.ksriqi,
											danxuan_num : ksinfo.danxuan_num,
											danxuan_fenzhi : ksinfo.danxuan_fenzhi,
											duoxuan_num : ksinfo.duoxuan_num,
											duoxuan_fenzhi : ksinfo.duoxuan_fenzhi,
											panduan_num : ksinfo.panduan_num,
											panduan_fenzhi : ksinfo.panduan_fenzhi,
											randomStr : ksinfo.randomStr,
											kslianjie : ksinfo.kslianjie,
											res_danxuan_arr : res_danxuan_arr,
											res_duoxuan_arr : res_duoxuan_arr,
											res_panduan_arr : res_panduan_arr,
											createTimeStamp : moment().format('X'),
											ckcs : ksinfo.ckcs,
											kscs : doc.kscs+1
										})
										new_stu_exam.save(function(err){
											if(err){
												console.log('new_stu_exam save err---->',err)
												cb(err)
											}else{
												cb(null,back)
											}
											
										})
									}else{
										back.kscs = 1
										console.log('第一次生成试卷---->')
										let new_stu_exam = new stu_exam({
											qstr : qstr,
											gonghao : req.session.student.alias,//这里替换成session中的alias
											xingming : req.session.student.cn,//这里替换成session中的cn
											ksname : ksinfo.ksname,
											ksshijian : ksinfo.ksshijian,
											ksriqi : ksinfo.ksriqi,
											danxuan_num : ksinfo.danxuan_num,
											danxuan_fenzhi : ksinfo.danxuan_fenzhi,
											duoxuan_num : ksinfo.duoxuan_num,
											duoxuan_fenzhi : ksinfo.duoxuan_fenzhi,
											panduan_num : ksinfo.panduan_num,
											panduan_fenzhi : ksinfo.panduan_fenzhi,
											randomStr : ksinfo.randomStr,
											kslianjie : ksinfo.kslianjie,
											res_danxuan_arr : res_danxuan_arr,
											res_duoxuan_arr : res_duoxuan_arr,
											res_panduan_arr : res_panduan_arr,
											createTimeStamp : moment().format('X'),
											ckcs : ksinfo.ckcs,
											kscs : 1
										})
										new_stu_exam.save(function(err){
											if(err){
												console.log('new_stu_exam save err---->',err)
												cb(err)
											}else
											{
												cb(null,back)
											}
											
										})
									}
								}//else
								
							})
					})
				}
			],function(err,result){
				if(err){
					console.log('async err-->',err)
					return res.json({'code':-1,'msg':err.message})
				}
				console.timeEnd('countdown')
				
				return res.render('front/ks',{'code':0,'result':result,'ksinfo':ksinfo})
				//return res.json({'code':-0,'msg':result})
			})
		}
		else{
			let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
			console.log('ReturnURL url-->',ReturnURL)
			console.log('you ticket, meiyou session')
			let ticket = req.query.ticket
			console.log('check ticket-->',ticket)
			let url = CASserver + 'serviceValidate?ticket=' + ticket + '&service=' + ReturnURL
			console.log('check url -->',url)
			request(url, function (error, response, body) {
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
						   		delete req.session.student
						   		console.log('check req.session.student-->',req.session.student)
						   		return res.json({'errCode':-1,'errMsg':'ticket is unvalid！'})
						   }else{
						   		req.session.student = arg
						   		return res.redirect(ReturnURL)
						  }
				     }else{
				     	console.log(error)
				     	return res.json({'errCode':-1,'errMsg':error})
				     }
			    })
		}
	}
})
//已完成考试列表
router.get('/myexamlist',function(req,res){
	if(!req.query.ticket){
		let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
		console.log('ReturnURL url-->',ReturnURL)
		let url = CASserver + 'login?service=' + ReturnURL
		console.log('check redirecturl -->',url)
		console.log('跳转获取ticket')

		if(req.session.user){
			console.log('没有ticket,学生有session')
			console.log('session-->',req.session.user)
			//返回页面让学困生填写联系方式，并将code对应的课程和学优生信息返回
			//如果学生已经选择好学优生，则直接显示最后结果
			//这一步加上判断，看学生是否已经选择了该辅导学生
			//找出所有考试的_id
			let search = stu_exam.find({})
				search.where('gonghao').equals(req.session.user.alias)
				search.where('is_end').equals(1)
				search.exec(function(err,doc){
					if(err){
						console.log('err-->',err)
						return res.json({'code':-1,'msg':err})
					}
					if(doc){
						console.log('check doc-->',doc)
						console.log('454444444')
						return res.render('front/myexamlist', { 'user': req.session.user,'examinfo':doc });
					}
					if(!doc){
						return res.render('front/myexamlist', { 'user': req.session.user,'examinfo':null });
					}
				})
		}
		else{
			console.log('没有ticket，去获取ticket')
			return res.redirect(url)
		}
	}
	else{
		if(req.session.user){
			console.log('有ticket,也有session')
			console.log('session-->',req.session.user)
			//找出所有考试的randomstr
			let search = stu_exam.find({})
				search.where('gonghao').equals(req.session.user.alias)
				search.where('is_end').equals(1)
				search.exec(function(err,doc){
					if(err){
						console.log('err-->',err)
						return res.json({'code':-1,'msg':err})
					}
					if(doc){
						console.log('check doc-->',doc)
						console.log('9999999')
						return res.render('front/myexamlist', { 'user': req.session.user,'examinfo':doc });
					}
					if(!doc){
						return res.json({'code':-1,'msg':'暂无记录'})
					}
				})
		}
		else{
			let ReturnURL = 'http://qiandao.szu.edu.cn:81/dxxxhjs' + req.originalUrl
			console.log('ReturnURL url-->',ReturnURL)
			console.log('you ticket, meiyou session')
			let ticket = req.query.ticket
			console.log('check ticket-->',ticket)
			let url = CASserver + 'serviceValidate?ticket=' + ticket + '&service=' + ReturnURL
			console.log('check url -->',url)
			request(url, function (error, response, body) {
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
						   		return res.json({'errCode':-1,'errMsg':'ticket is unvalid,请重新扫码！'})
						   }else{
						   		req.session.user = arg
						   		return res.redirect(ReturnURL)
						  }
				     }else{
				     	console.log(error)
				     }
			    })
		}
	}
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
router.get('/test1',function(req,res){
	// let search = cat.find({})
	// 	search.where('catname').equals('党史')
	// 	search.where('leixing').equals('判断')
	// 	search.where('random').gte(20)
	// 	search.exec(function(err,doc){
	// 		console.log('doc length',doc.length)
	// 	})
	// for(let i=0;i<100;i++){
	// 	console.log(Math.round((Math.random()) *50))
	// }
	res.render('front/test1')
})
router.post('/checkks',function(req,res){
	let randomStr = req.body.randomStr,
		danxuan_arr = JSON.parse(req.body.danxuan_arr),
		duoxuan_arr = JSON.parse(req.body.duoxuan_arr),
		panduan_arr = JSON.parse(req.body.panduan_arr),
		shijuan = null,
		danxuan_fenzhi = 0,
		danxuan_defen = 0,
		duoxuan_fenzhi = 0,
		duoxuan_defen = 0,
		panduan_fenzhi = 0,
		panduan_defen = 0,
		danxuan_dadui = 0,
		danxuan_dacuo = 0,
		panduan_dadui = 0,
		panduan_dacuo = 0,
		duoxuan_dadui = 0,
		duoxuan_dacuo = 0
	console.log('check randomStr---->',randomStr)
	console.log('check danxuan_arr---->',danxuan_arr)
	console.log('check duoxuan_arr---->',duoxuan_arr)
	console.log('check panduan_arr---->',panduan_arr)

	console.log('check session-->',req.session)
	async.waterfall([
		function(cb){
			let search = stu_exam.findOne({})
				search.where('randomStr').equals(randomStr)
				search.where('gonghao').equals(req.session.student.alias)//这里替换成session中的alias
				search.sort({'kscs':-1})
				search.limit(1)
				search.exec(function(err,doc){
					if(err){
						console.log('查找试卷错误',err)
						cb(err)
					}
					if(doc){
						console.log('找到试卷')
						shijuan = doc
						danxuan_fenzhi = doc.danxuan_fenzhi
						duoxuan_fenzhi = doc.duoxuan_fenzhi
						panduan_fenzhi = doc.panduan_fenzhi
						cb(null)
					}
				})
		},
		function(cb){
			console.log('检查单选')
			async.eachLimit(danxuan_arr,1,function(item,callback){
				console.log('item---->',item)
				let temp = item.split(':'),
					timuid = temp[0],
					timuda = temp[1],
					choose = temp[2]
				console.log('题目id-->',timuid)
				console.log('对应答案-->',timuda)
				async.eachLimit(shijuan.res_danxuan_arr,1,function(ite,callback1){
					if(ite._id == timuid){
						console.log('找到该题,下面判断该题答案是否正确',ite)
						async.eachLimit(ite.xuanxiang,1,function(it,callback2){
							if(it._id == timuda && it.is_correct == true){
								console.log('该题答对了,该题是',it)
								danxuan_defen += danxuan_fenzhi 
								danxuan_dadui++
								console.log('danxuan_defen',danxuan_defen)
								callback2()
							}
							else{
								console.log('该题答错了')
								callback2()
							}
						},function(e){
							if(e){
								console.log('xuanxiang eachLimit e',e)
								callback1(e)
							}
							ite.choose = choose
							console.log('检查选择的答案-->',choose)
							console.log('检查ite-->',ite)
							callback1()
						})
					}
					else{
						console.log('还在循环找题')
						callback1()
					}
				},function(er){
					if(er){
						console.log('shijuan.res_danxuan_arr eachLimit er',er)
						callback(er)
					}
					callback()
				})
				//callback()
			},function(err){
				if(err){
					console.log('eachLimit danxuan_arr err-->',err)
					cb(err)
				}
				else{
					console.log('单选检查结束,每道题分值,答对,共得分',danxuan_fenzhi,danxuan_dadui,danxuan_defen)
					//这里更新一下试卷
					stu_exam.update({'_id':shijuan._id},{'res_danxuan_arr':shijuan.res_danxuan_arr},function(err){
						if(err){
							console.log('update shijuan.res_danxuan_arr err',err)
							cb(err)
						}
						console.log('update shijuan.res_danxuan_arr success')
						console.log()
						console.log()
						console.log()
						cb()
					})
				}
			})
		},
		function(cb){
			console.log('检查判断')
			async.eachLimit(panduan_arr,1,function(item,callback){
				console.log('item---->',item)
				let temp = item.split(':'),
					timuid = temp[0],
					timuda = temp[1],
					choose = temp[2]
				console.log('题目id-->',timuid)
				console.log('对应答案-->',timuda)
				async.eachLimit(shijuan.res_panduan_arr,1,function(ite,callback1){
					if(ite._id == timuid){
						console.log('找到该题,下面判断该题答案是否正确',ite)
						async.eachLimit(ite.xuanxiang,1,function(it,callback2){
							if(it._id == timuda && it.is_correct == true){
								console.log('该题答对了,该题是',it)
								panduan_defen += panduan_fenzhi 
								panduan_dadui++
								console.log('panduan_defen',panduan_defen)
								callback2()
							}
							else{
								console.log('该题答错了')
								callback2()
							}
						},function(e){
							if(e){
								console.log('xuanxiang eachLimit e',e)
								callback1(e)
							}
							ite.choose = choose
							console.log('检查选择的答案-->',choose)
							console.log('检查ite-->',ite)
							callback1()
						})
					}
					else{
						console.log('还在循环找题')
						callback1()
					}
				},function(er){
					if(er){
						console.log('shijuan.res_panduan_arr eachLimit er',er)
						callback(er)
					}
					callback()
				})
				//callback()
			},function(err){
				if(err){
					console.log('eachLimit panduan_arr err-->',err)
					cb(err)
				}
				else{
					console.log('判断检查结束,每道题分值,答对,共得分',panduan_fenzhi,panduan_dadui,panduan_defen)
					//这里更新一下试卷
					stu_exam.update({'_id':shijuan._id},{'res_panduan_arr':shijuan.res_panduan_arr},function(err){
						if(err){
							console.log('update shijuan.res_panduan_arr err',err)
							cb(err)
						}
						console.log('update shijuan.res_panduan_arr success')
						console.log()
						console.log()
						console.log()
						cb()
					})
				}
			})
		},
		function(cb){
			console.log('检查多选')
			async.eachLimit(duoxuan_arr,1,function(item,callback){
				console.log('item---->',item)
				let temp = item.split(':'),
					timuid = temp[0],
					timuda_str = temp[1],
					timuda_choose = temp[2]
				let timuda_arr = timuda_str.split(','),
					timuda_duibi = timuda_arr.sort().toString(),
					zhengque_arr = []
				console.log('题目id-->',timuid)
				console.log('对应答案-->',timuda_arr)
				async.eachLimit(shijuan.res_duoxuan_arr,1,function(ite,callback1){
					if(ite._id == timuid){
						console.log('找到该题,下面判断该题答案是否正确',ite)
						async.eachLimit(ite.xuanxiang,1,function(it,callback2){
							if(it.is_correct == true){
								console.log('找到一个正确答案',it)
								zhengque_arr.push(it._id)
								console.log('zhengque_arr-->',zhengque_arr)
								callback2()
							}else{
								callback2()
							}
						},function(e){
							if(e){
								console.log('xuanxiang eachLimit e',e)
								callback1(e)
							}
							zhengque_arr = zhengque_arr.sort().toString()
							if(timuda_duibi == zhengque_arr){
								console.log('该题答对了')
								duoxuan_defen += duoxuan_fenzhi 
								duoxuan_dadui++
								console.log('duoxuan_defen',duoxuan_defen)
								ite.choose = timuda_choose
								console.log('检查选择的答案-->',timuda_choose)
								console.log('检查ite-->',ite)
								callback1()
							}
							else{
								console.log('该题错了')
								ite.choose = timuda_choose
								console.log('检查选择的答案-->',timuda_choose)
								console.log('检查ite-->',ite)
								callback1()
							}
						})
					}
					else{
						console.log('还在循环找题')
						callback1()
					}
				},function(er){
					if(er){
						console.log('shijuan.res_duoxuan_arr eachLimit er',er)
						callback(er)
					}
					callback()
				})
				//callback()
			},function(err){
				if(err){
					console.log('eachLimit duoxuan_arr err-->',err)
					cb(err)
				}
				else{
					console.log('多选检查结束,每道题分值,答对,共得分',duoxuan_fenzhi,duoxuan_dadui,duoxuan_defen)
					//这里更新一下试卷
					stu_exam.update({'_id':shijuan._id},{'res_duoxuan_arr':shijuan.res_duoxuan_arr},function(err){
						if(err){
							console.log('update shijuan.res_duoxuan_arr err',err)
							cb(err)
						}
						console.log('update shijuan.res_duoxuan_arr success')
						console.log()
						console.log()
						console.log()
						cb()
					})
				}
			})
		},
		function(cb){
			let tempresult = {}
				tempresult.danxuan_dadui = danxuan_dadui
				tempresult.danxuan_defen = danxuan_defen
				tempresult.panduan_dadui = panduan_dadui
				tempresult.panduan_defen = panduan_defen
				tempresult.duoxuan_dadui = duoxuan_dadui
				tempresult.duoxuan_defen = duoxuan_defen
				tempresult.zongfen = danxuan_defen + panduan_defen + duoxuan_defen
				console.log('该次考试总分-->',tempresult.zongfen)
				let search = stu_exam.findOne({})
					search.where('_id').equals(shijuan._id)
					search.exec(function(err,doc){
						if(err){
							console.log('search stu_exam err')
							console.log(err)
							cb(err)
						}
						else{
							let nowTimeStamp = moment().format('X'),
							createTimeStamp = doc.createTimeStamp,
							cha = Number(nowTimeStamp) - Number(createTimeStamp),
							res_cha = MillisecondToDate(cha)
							console.log('check res_cha---->',res_cha,cha)
							stu_exam.update({'_id':shijuan._id},{'zongfen':tempresult.zongfen,'is_end':1,'cha':res_cha,'tijiaoTimeStamp':nowTimeStamp},function(err){
								if(err){
									console.log('插入分数和时间出错',err)
									cb(err)
								}
								console.log('插入分数和时间----->',tempresult.zongfen,res_cha)
								tempresult.res_cha = res_cha
								cb(null,tempresult)
							})
						}
					})
		}
	],function(error,result){
		if(error){
			console.log('waterfall error',error)
			return res.json({'code':-1,'msg':error})
		}
		//console.log('waterfall success',result)
		return res.json({'code':0,'result':result})
	})
})
function MillisecondToDate(msd) {  
    var time = parseFloat(msd);  
    if (null!= time &&""!= time) {  
        if (time >60&& time <60*60) {  
            time = parseInt(time /60.0) +"分钟"+ parseInt((parseFloat(time /60.0) -  
            parseInt(time /60.0)) *60) +"秒";  
        }else if (time >=60*60&& time <60*60*24) {  
            time = parseInt(time /3600.0) +"小时"+ parseInt((parseFloat(time /3600.0) -  
            parseInt(time /3600.0)) *60) +"分钟"+  
            parseInt((parseFloat((parseFloat(time /3600.0) - parseInt(time /3600.0)) *60) -  
            parseInt((parseFloat(time /3600.0) - parseInt(time /3600.0)) *60)) *60) +"秒";  
        }else {  
            time = parseInt(time) +"秒";  
        }  
    }else{  
        time = "0 时 0 分0 秒";  
    }  
    return time;  
  
}  
module.exports = router;
