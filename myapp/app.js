var express = require('express');
var fs = require('fs');
var ejs = require('ejs');
var mysql = require('mysql');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var dte = require('date-utils');
var ncbi = require('node-ncbi');
var async = require('async');
var eutils = require('ncbi-eutils');
const update = require('react-addons-update');

const app = express();
//app.use(cookieParser)
const pubmed = ncbi.pubmed;

var keyword;
var titlename = "";
var pid = 0;
var orders = 0;
var parents = 0;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));
//app.use(cookieParser());

//DB아이디 비번 임의로 작성


//db연결

var client = mysql.createConnection({
  host: "projectdb.cjdbbm9zlk2l.ap-northeast-2.rds.amazonaws.com",
  user: "user",
  password: "final_kyp1996",
  database: "projectdb"
});
//디비 연결
client.connect();


/*
// local database
var client = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "final_project"
});

client.connect();
*/

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 3000);


//메인화면에서 view에 있는 main.ejs가 나타나게 함
// main.ejs는 키워드 검색 기능만 제공하며, 데이터 받아오기만 하는 기능이다.
app.get('/', function(request,response){
	fs.readFile('./views/main.ejs','utf8',(error,data)=>{
		if(!error) {
			console.log('main');
			response.send(ejs.render(data, {}));
		}
	});
});

// 메인에서 keyword 를 받아왔을 때 넘겨주는 post 함수
app.post('/',(request,response)=>{
	let body = request.body;
	keyword = body.searchBar;
	console.log("search keyword is ", keyword);
	response.redirect('/search');
});


// post 함수를 이용해서 search값을 받아왔을때 index.ejs를 보여주는 app.get
// 이부분만 계속 돌려막기 할 것
app.get('/search', function(request, response){
	fs.readFile('./views/index.ejs', 'utf8', (error, data)=>{
		if(!error){
			client.query('SELECT * FROM hisDB',[], function(err, dbdata){
			pubmed.search(keyword, 0, 8).then((results)=>{
				response.send(ejs.render(data, {
					paper:results,
					pubmed:pubmed,
					database:dbdata,
          keyword:keyword
				}));
			});
			console.log(dbdata);
		});
	}else console.log(error);
});
});


// 버튼에 따라서 save와 research 를 분리
// search 부분에서도 post로 값 받아오는 부분이 필요하다.
//  검색할때는 order 증가 (root노드), save할 때는 증가 (root에 이어진 노드)
app.post('/search', (request, response)=>{
	let body = request.body;
	keyword = body.searchBar;
//	var example = example;

//키워드 검색
if(body.search){
		parents = 0;
		orders = orders + 1;
  	console.log("search keyword is ", keyword);
		response.redirect('/search');
	}

//키워드 저장
if(body.save){
      orders = orders + 1;
      parents = 0;
//		parents = parents + 1;
			console.log("just before query" + keyword, pid, orders, parents)
		 	client.query('INSERT INTO hisDB (searched,pubmedid,pname,ordering,parent)VALUES(?,?,?,?,?)',[keyword,null,null,orders,parents],()=>{
			console.log("sell Insertion into DB was completed !");
			});
			response.redirect('/search');
			console.log("save keyword button clicked");
	}

});

const deepSearch = function(find, data) {
  var found = [];
  if (typeof data !== 'object') {
    return found;
  }
  Object.keys(data).forEach(key => {
    const value = data[key];
    // console.log("\nkey value: "+String(key));
    if (String(key).toLowerCase() === String(find).toLowerCase()) {
      found.push(value);
    }
    found = found.concat(deepSearch(find, value))
  });
  return found;
}

const nodeValue = function(node) {
  if (typeof node === 'string') {
    return node;
  } else if (Array.isArray(node)) {
    return nodeValue(node[0]);
  } else if (typeof node === 'object') {
    return nodeValue(node._);
  } else {
    return null;
  }
}
const nodeValues = function(nodes){
  return update(nodes, {$apply: (node) => {
    return nodeValue(node);
  }});
}

app.get('/view', (request, response)=>{
	var abstr = "";
    eutils.efetch({db:'pubmed', id:[pid], retmode:'xml'}).then(function(d) {
      var nodes = deepSearch('abstracttext', d);
      console.log(JSON.stringify(nodes));
      Object.keys(nodes[0]).forEach(key=>{
        console.log("\n\n"+ nodeValues(nodes[0][key]));
        abstr = abstr.concat(nodeValues(nodes[0][key]));
      });
      console.log("\nabstr: "+ abstr);
    fs.readFile('./views/abstract.ejs', 'utf8', (error, data)=>{
			if(!error){
				console.log("bark, bark!\n");
				pubmed.summary(pid).then((results)=>{
					console.log(results);
					response.send(ejs.render(data, {
						abstr:abstr,
						pubDate: results.pubDate,
						title: results.title,
						authors: results.authors,
						pubmed:pubmed
					}));
				});
			}
			else console.log(error);
		});
  });
});


app.post('/view', (request, response)=>{
	let body = request.body;
	//pid 받아오기
	if(body.selected_pid_0){
		pid = body.selected_pid_0;
	} if(body.selected_pid_1){
		pid = body.selected_pid_1;
	} if(body.selected_pid_2){
		pid = body.selected_pid_2;
	} if(body.selected_pid_3){
		pid = body.selected_pid_3;
	} if(body.selected_pid_4){
		pid = body.selected_pid_4;
	} if(body.selected_pid_5){
		pid = body.selected_pid_5;
	} if(body.selected_pid_6){
		pid = body.selected_pid_6;
	} if(body.selected_pid_7){
		pid = body.selected_pid_7;
	}
	console.log("\n\npid is " + pid);

	//논문 정보 전체 보기
  	if(body.view){
		console.log("button view clicked");
		response.redirect('/view');
	}

//논문 pid 저장
	if(body.title_save){
		parents = parents + 1;

			pubmed.summary(pid).then((results) => {
			client.query('INSERT INTO hisDB (searched,pubmedid,pname,ordering,parent)VALUES(?,?,?,?,?)',[keyword,pid, results.title,orders,parents],()=>{
			console.log("sell Insertion into DB was completed !");
		});
			console.log("title save button clicked");
			response.redirect('/search');
		});
  }

  if(body.back){
    response.redirect('/search');
  }

  if(body.full_txt){
    console.log("This is full text");
    response.redirect('/view');
  }

});


app.listen(app.get('port'),function(){
	console.log('server running at ' + app.get('port'));
});
