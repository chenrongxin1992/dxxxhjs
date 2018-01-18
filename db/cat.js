/**
 *  @Author:    chenrongxin
 *  @Create Date:   2018-1-18
 *  @Description:   题目类别表
 */
var mongoose = require('./db'),
    Schema = mongoose.Schema,
    moment = require('moment')

var catSchema = new Schema({ 
    catname : {type : String},//分类名:如党章、十九大         
    questionnum : {type : Number },//每个类别题目数
    inused : {type : Number,default : 1},//该类别是否在用，0未启用，1禁用
    leixing : {type : String},//单选，多选，判断
    timu : {type : String},//题目(党章的意义是什么) 
    fenzhi : {type : Number },//该题分值(5,4)
    zqda : {type : String},//正确答案(A,B,C,D,E,F / AB,AD / 1,2)
    xuanxiang1 : {type : String},//选项1(格式：)
    xuanxiang2 : {type : String },//选项2
    xuanxiang3 : {type : String,default : null },//选项3
    xuanxiang4 : {type : String,default : null },//选项4
    xuanxiang5 : {type : String,default : null },//选项5
    xuanxiang6 : {type : String,default : null },//选项6
    xuanxiang7 : {type : String,default : null },//选项7
    xuanxiang8 : {type : String,default : null },//选项8
    peopleinfo : {type : String},//录入人员信息
    createTime : {type : String, default : moment().format('YYYY-MM-DD HH:mm:ss') },//创建时间
    createTimeStamp : {type : String,default : moment().format('X')}//创建时间戳
})

module.exports = mongoose.model('catinfo',catSchema);