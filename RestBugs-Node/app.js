/*Setup*/
var express = require('express'); // used 2.5.9

var databaseUrl = "restbugs";
var collections = ["bugs"];
var mongo = require('mongojs');
var db = mongo.connect(databaseUrl, collections);

var port;
if (process.argv[2])
	port = parseInt(process.argv[2]);
else {
	console.log("No port number given! Here's an example:"); 
	console.log(" $ node app.js 9200");
	process.kill();
	return;
}


var app = express();
app.listen(port);

var webPort = "9200";

app.configure(function(){
	app.set('view engine', 'ejs');
	app.set('view options', {
		layout: false
	});
	app.use(express.bodyParser());	//where is app.use defined and what does it do??
	app.use(express.static(__dirname + '/public'));
});

/*Helper functions*/

function addToHistory(doc, comments, stateChanges){
	if(doc.history === undefined)
		doc.history = [];

	doc.history.push({
		addedOn: new Date(),
		comments: comments,
		changes: stateChanges
	});
};

function updateStatus(doc, status, comments){
	doc.status = status;
	addToHistory(doc, comments, {status : doc.status});
};

function activate(doc, comments){
	updateStatus(doc, 'Working', comments);
};

function resolve(doc, comments){
	updateStatus(doc, 'QA', comments);
};

function close(doc, comments){
	updateStatus(doc, 'Done', comments);
};

function toBacklog(doc, comments){
	updateStatus(doc, 'Backlog', comments);
};

function newbug(title, description){
	var bug = {		
		title: title,
		description: description
	};
	toBacklog(bug, "bug created");
	return bug;
};

/*API Surface*/

app.get('/bugs', function(req, res){
	console.log();
	res.render('bugs-all.ejs', { 
		title: "Index",
		renderWeb: isHuman(req.headers.host)
	});
});

app.get('/bugs/backlog', function(req, res){

	//var userAgent = req.headers["user-agent"];
	//console.log(userAgent);
	// TODO Grep for Mobile and load different js and css

	db.bugs.find({status: 'Backlog'}, function(err, docs) {
		res.render('bugs-all.ejs', { 
			title: "Backlog", 
			model: docs,
			renderWeb: isHuman(req.headers.host)
		});	
	});
});

var isHuman = function(host){
	return host && host.indexOf(webPort) !== -1
};

app.post('/bugs/backlog', function(req, res){

	var setResponse = function(res){
				
		if (isHuman(req.headers.host)) {
			res.redirect("/bugs/backlog");
		}			
		else {
			var statusCode = 201;
			res.statusCode = statusCode;
			res.render("response.ejs", {
				statusCode: statusCode,
				body: "Created bug"
			});
		}
	};

	//todo: consider replacing with upsert-style call
	if(req.body.id===undefined) {

		// NOTE For debugging
		//setResponse(res);
		//return;

		db.bugs.save(
			newbug(req.body.title, req.body.description), 
			function(err, savedDoc) {
				db.bugs.find( {status: 'Backlog'}, function(err, docs) {
					setResponse(res);		
				});
		});
	} else {

		var setResponseUpdate = function(res){
				
			if (isHuman(req.headers.host)) {
				res.redirect("/bugs/backlog");
			}			
			else {
				var statusCode = 201;
				res.statusCode = statusCode;
				res.render("response.ejs", {
					statusCode: statusCode,
					body: "Moved bug to backlog"
				});
			}
		};

		db.bugs.findOne( {_id: mongo.ObjectId(req.body.id) }, function(err, doc) {
			//todo: return 404 if doc is undefined

			toBacklog(doc, req.body.comments);

			db.bugs.update( {_id: mongo.ObjectId(req.body.id) }, doc, function(err, updatedDoc){
				db.bugs.find({status:'Backlog'}, function(err, docs){
					setResponseUpdate(res);
				});
			});
		});
	}
});

app.get('/bugs/working', function(req, res){
	db.bugs.find({status:'Working'}, function(err, docs){
		res.render('bugs-all.ejs', { 
			title: "Working", 
			model: docs,
			renderWeb: isHuman(req.headers.host) 
		});	
	});
});

app.post('/bugs/working', function(req, res){
	db.bugs.findOne( {_id: mongo.ObjectId(req.body.id) }, function(err, doc) {
		//todo: return 404 if doc is undefined

		activate(doc, req.body.comments);

		var setResponse = function(res){
				
			if (isHuman(req.headers.host)) {
				res.redirect("/bugs/working");
			}			
			else {
				var statusCode = 201;
				res.statusCode = statusCode;
				res.render("response.ejs", {
					statusCode: statusCode,
					body: "Moved bug to working"
				});
			}
		};

		db.bugs.update( {_id: mongo.ObjectId(req.body.id) }, doc, function(err, updatedDoc){
			db.bugs.find({status:'Working'}, function(err, docs){
				setResponse(res);
			});
		});
	});
});

app.get('/bugs/qa', function(req, res){
	db.bugs.find({status:'QA'}, function(err, docs){
		res.render('bugs-all.ejs', { 
			title: "QA", 
			model: docs,
			renderWeb: isHuman(req.headers.host)
		});	
	});
});

app.post('/bugs/qa', function(req, res){
	db.bugs.findOne( {_id: mongo.ObjectId(req.body.id) }, function(err, doc) {
		//todo: return 404 if doc is undefined

		resolve(doc, req.body.comments);

		var setResponse = function(res){
				
			if (isHuman(req.headers.host)) {
				res.redirect("/bugs/qa");
			}			
			else {
				var statusCode = 201;
				res.statusCode = statusCode;
				res.render("response.ejs", {
					statusCode: statusCode,
					body: "Moved bug to QA"
				});
			}
		};

		db.bugs.update( {_id: mongo.ObjectId(req.body.id) }, doc, function(err, updatedDoc){
			db.bugs.find({status:'QA'}, function(err, docs){
				setResponse(res);
			});
		});
	});
});

app.get('/bugs/done', function(req, res){
	db.bugs.find({status:'Done'}, function(err, docs){
		res.render('bugs-all.ejs', { 
			title: "Done", 
			model: docs,
			renderWeb: isHuman(req.headers.host)
		});	
	});
});

app.post('/bugs/done', function(req, res){
	db.bugs.findOne( {_id: mongo.ObjectId(req.body.id) }, function(err, doc) {
		//todo: return 404 if doc is undefined

		close(doc, req.body.comments);

		var setResponse = function(res){
				
			if (isHuman(req.headers.host)) {
				res.redirect(303, "http://localhost:9200/bugs/done");
			}			
			else {
				var statusCode = 201;
				res.statusCode = statusCode;
				res.render("response.ejs", {
					statusCode: statusCode,
					body: "Moved bug to done"
				});
			}
		};

		db.bugs.update( {_id: mongo.ObjectId(req.body.id) }, doc, function(err, updatedDoc){
			db.bugs.find({status:'Done'}, function(err, docs){
				setResponse(res);
			});
		});
	});
});

/*first, let's remove any initial values in the database*/
//db.bugs.remove({});
