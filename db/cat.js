/**
 *  @Author:    chenrongxin
 *  @Create Date:   2018-1-18
 *  @Description:   题目类别表
 */

    const mongoose = require('mongoose')
    mongoose.Promise = global.Promise;
    //服务器上
    const DB_URL = 'mongodb://dxxxhjs:youtrytry@localhost:27017/dxxxhjs'
    //本地
    //const DB_URL = 'mongodb://localhost:27017/dxxxhjs'
    mongoose.connect(DB_URL,{  
        server: {
            autoReconnect: true,
            poolSize: 10
        }
    })

    /**
      * 连接成功
      */
    mongoose.connection.on('connected', function () {    
        console.log('Mongoose connection open to ' + DB_URL);  
    });    

    /**
     * 连接异常
     */
    mongoose.connection.on('error',function (err) {    
        console.log('Mongoose connection error: ' + err);  
    });    
     
    /**
     * 连接断开
     */
    mongoose.connection.on('disconnected', function () {    
        console.log('Mongoose connection disconnected');  
    });   

//var mongoose = require('./db'),
    let Schema = mongoose.Schema,
    moment = require('moment')

var catSchema = new Schema({ 
    id : {type:Number},
    catname : {type:String},//分类名:如党章、十九大         
    inused : {type:Boolean,default:true},//该类别是否在用
    leixing : {type:String},//单选，多选，判断
    timu : {type:String},//题目(党章的意义是什么) 
    zqda : {type : String},//正确答案(A,B,C,D,E,F / AB,AD / 1,2)
    xuanxiang : [{
        id : {type:Number},//选项id
        content : {type:String,default:null},//选项内容
        is_correct : {type:Boolean,default:false}//是否为正确选项0错
    }],
    random:{type:Number,default:parseInt(Math.random()*100000)},
    peopleinfo : {type:String,default:null},//录入人员信息
    createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
    createTimeStamp : {type:String,default:moment().format('X')}//创建时间戳
})

//试卷设置
var sjszSchema = new Schema({ 
    ckcs : {type:Number,default:3},//可重考次数
    id : {type:Number},//试卷设置记录
    ksname : {type:String},//该次考试主题(比如第一单元，第二单元) 
    ksshijian : {type:Number},//考试时间
    ksriqi : {type:String},//考试日期
    danxuan_num : {type:Number},
    danxuan_fenzhi : {type:Number},//每道单选题分值
    panduan_num : {type:Number},
    panduan_fenzhi : {type:Number},//每道判断题分值
    duoxuan_num : {type:Number},
    duoxuan_fenzhi : {type:Number},
    per_of_modal : [{
        id:{type:Number},
        name:{type:String},
        percent:{type:Number},
        num_danxuan:{type:Number,default:0},
        num_duoxuan:{type:Number,default:0},
        num_panduan:{type:Number,default:0}
    }],
    randomStr : {type:String},
    kslianjie : {type:String},
    peopleinfo : {type:String,default:null},//录入人员信息
    createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
    createTimeStamp : {type:String,default:moment().format('X')}//创建时间戳
})

var stu_examSchema = new Schema({
    kscs : {type:Number,default:0},//已考次数
    ckcs : {type:Number,default:3},//可重考次数
    qstr : {type:String},
    kaoshiyongshi:{type:Number},
    is_end : {type:Number,default:0},
    zongfen : {type:Number,default:0},
    gonghao : {type:String},
    xingming : {type:String},
    id : {type:Number},
    ksname : {type:String},//该次考试主题(比如第一单元，第二单元) 
    ksshijian : {type:Number},//考试时间
    ksriqi : {type:String},//考试日期
    danxuan_num : {type:Number},
    danxuan_fenzhi : {type:Number},//每道单选题分值
    panduan_num : {type:Number},
    panduan_fenzhi : {type:Number},//每道判断题分值
    duoxuan_num : {type:Number},
    duoxuan_fenzhi : {type:Number},
    randomStr : {type:String},
    kslianjie : {type:String},
    res_danxuan_arr : [{
        choose:{type:String},//选择的答案
        id : {type:Number},
        catname : {type:String},//分类名:如党章、十九大         
        leixing : {type:String},//单选，多选，判断
        timu : {type:String},//题目(党章的意义是什么) 
        xuanxiang : [{
            id : {type:Number},//选项id
            content : {type:String,default:null},//选项内容
            is_correct : {type:Boolean,default:false}//是否为正确选项0错
        }],
        peopleinfo : {type:String,default:null},//录入人员信息
        createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
        createTimeStamp : {type:String,default:moment().format('X')}//创建时间戳
    }],
    res_duoxuan_arr : [{
        choose:{type:String},//选择的答案
        id : {type:Number},
        catname : {type:String},//分类名:如党章、十九大         
        leixing : {type:String},//单选，多选，判断
        timu : {type:String},//题目(党章的意义是什么) 
        xuanxiang : [{
            id : {type:Number},//选项id
            content : {type:String,default:null},//选项内容
            is_correct : {type:Boolean,default:false}//是否为正确选项0错
        }],
        peopleinfo : {type:String,default:null},//录入人员信息
        createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
        createTimeStamp : {type:String,default:moment().format('X')}//创建时间戳
    }],
    res_panduan_arr : [{
        choose:{type:String},//选择的答案
        id : {type:Number},
        catname : {type:String},//分类名:如党章、十九大         
        leixing : {type:String},//单选，多选，判断
        timu : {type:String},//题目(党章的意义是什么) 
        xuanxiang : [{
            id : {type:Number},//选项id
            content : {type:String,default:null},//选项内容
            is_correct : {type:Boolean,default:false}//是否为正确选项0错
        }],
        peopleinfo : {type:String,default:null},//录入人员信息
        createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
        createTimeStamp : {type:String,default:moment().format('X')}//创建时间戳
    }],
    peopleinfo : {type:String,default:null},//录入人员信息
    createTime : {type:String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
    createTimeStamp : {type:String,default:moment().format('X')},//创建时间戳
    tijiaoTimeStamp:{type:String},
    cha:{type:String}//完成时间
})
//module.exports = mongoose.model('catinfo',catSchema);
exports.stu_exam = mongoose.model('stu_exam',stu_examSchema);
exports.catinfo = mongoose.model('catinfo',catSchema);
exports.sjsz = mongoose.model('sjsz',sjszSchema)