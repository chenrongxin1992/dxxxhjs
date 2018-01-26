var express = require('express');
var router = express.Router();
const sjsz = require('../../db/cat').sjsz
const moment = require('moment')
const async = require('async')
/*
//code:{-1:数据库出错或其它错误，-2：结果为空，-3：考试日期已过，-4：考试尚未开始}
 */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/ks',function(req,res){
	let randomStr = req.query.code
	console.log('check randomStr-->',randomStr)
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
		function(doc,cb){
			let danxuan_num = doc.danxuan_num,
				duoxuan_num = doc.duoxuan_num,
				panduan_num = doc.panduan_num
			console.log('试题设置参数(单选，多选，判断)-->',danxuan_num,duoxuan_num,panduan_num)
				
		}
	],function(err,result){
		if(err){
			console.log('async err-->',err)
			return res.json({'code':-1,'msg':err.message})
		}

	})
})

module.exports = router;
