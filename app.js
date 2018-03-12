var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');//express.bodyParser实际上包括了三部分：express.json, express.urlencoded, 和 express.multipart(就是处理了文件的部分)
const session = require('express-session')

var index = require('./routes/manage/index');//后台管理路由
var front = require('./routes/front/front')//前端路由
var users = require('./routes/users');
var redirect = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//
app.use(logger('dev'));
app.use(bodyParser.json());
//app.use(express.bodyParser({uploadDir:'./uploads'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//add session
app.use(session({ 
	resave: false, //添加 resave 选项  
  	saveUninitialized: true, //添加 saveUninitialized 选项 
    secret: 'dangxiaoxinxihuajianshe',
    cookie:{ 
        maxAge: 1000*60*60*24
    }
}));
app.use(function(req,res,next){ 
    res.locals.user = req.session.user;   // 从session 获取 user对象
    res.locals.student = req.session.student
    
    let ip = req.headers['x-forwarded-for'] ||
              req.ip ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress || '';
    if(ip.split(',').length>0){
      console.log('ip --- >',ip)
        ip = ip.split(',')[0]
    }
    console.log('check client ip ---> ',ip)
    next();  //中间件传递
});

app.use('/',redirect)
app.use('/manage', index);//后台路由
app.use('/front', front);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

front.scheduleJob()

module.exports = app;
