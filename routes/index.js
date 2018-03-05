var express = require('express');
var router = express.Router();
const ejsExcel = require('ejsexcel')
const fs = require('fs')

/* GET home page. */
router.get('/', function(req, res, next) {
	//logger.debug('here')
	console.log('dddddddddddddddddd')
	res.redirect('/dxxxhjs/manage')
  	//res.render('index', { title: 'Express' });
});


router.get('/importnew_',function(req,res){
	console.log(__dirname)
    let exBuf=fs.readFileSync(__dirname+'/自动机与形语言_导入格式.xlsx');
		ejsExcel.getExcelArr(exBuf).then(exlJson=>{
		    console.log("---------------- read success:getExcelArr ----------------");
		    let workBook=exlJson;
		    let workSheets=workBook[0];
		    // let testarr = new Array()
		    // console.log('type of workSheets-->',typeof workSheets)
		    // console.log('testarr -->',typeof testarr)
		    async.eachLimit(workSheets,1,function(item,cb){
		    	console.log('item[7]-->',item[7])
		    	console.log('item[8]-->',item[8])
			    let tempTime = ''
				if(item[7] != '没空'){
					tempTime = '周一 ' + item[7] + '， '
				}
				if(item[8] != '没空'){
					tempTime = tempTime + '周二' + item[8] + '， '
				}
				if(item[9] != '没空'){
					tempTime = tempTime + '周三 ' + item[9] + '， '
				}
				if(item[10] != '没空'){
					tempTime = tempTime + '周四 ' + item[10] + '， '
				}
				if(item[11] != '没空'){
					tempTime = tempTime + '周五 ' + item[11] + '， '
				}
				if(item[12] != '没空'){
					tempTime = tempTime + '周六 ' + item[12] + '， '
				}
				if(item[13] != '没空'){
					tempTime = tempTime + '周日 ' + item[13] 
				}
				let temp_dang = ''
				if(item[6] == '是' || item[6] == '党员'){
					temp_dang = '1'
				}
				else if(item[6] == '否' || item[6] == '其他'){
					temp_dang = '0'
				}
				else{
					temp_dang = '2'
				}
		    	let majorstu_new = new majorStu({
		    		code : item[0],
		    		stuName : item[1],
		    		stuXueHao : item[2],
		    		stuGender : item[3],
		    		stuPhoneNum : item[4],
		    		majorName : item[5],
		    		dang : temp_dang,
		    		teachTime : tempTime
		    	})
		    	majorstu_new.save(function(err,doc){
		    		if(err){
		    			console.log('save err')
		    			cb(err)
		    		}
		    		//console.log('save success')
		    		//console.log('result-->',doc)
		    		cb(null)
		    	})
		    },function(err){
		    	if(err){
		    		console.log('eachLimit err')
		    		console.log(err.message)
		    	}
		    })
		    // workSheets.forEach((item,index)=>{
		    //         console.log((index+1)+" row:"+item.join('    '));
		    // })
		}).catch(error=>{
		    console.log("************** had error!");
		    console.log(error);
		});
})
module.exports = router;
