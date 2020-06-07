const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var session = require('express-session');
var sqlinjection = require('sql-injection');

const app = express();


const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
 
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message:
    "Prea multe încercări de la același IP, mai încercați peste o oră"
});


/*app.configure(function() {
    app.use(sqlinjection);  // add sql-injection middleware here
});*/

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(session({
	secret:'secret',
	resave:false,
	saveUninitialized:false,
	cookie:{
	maxAge:null
	}}));
	
//defining blacklist
var BLACKLIST =['192.0.0.1'];


	  

const port = 6789;


app.use(function(req, res, next) {
	res.locals.numeLogat = req.session.numeLogat;
	res.locals.id=req.session.id;
	next();
  });
  
  

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res

// LAB 10
//app.get('/', (req, res) => res.send('Hello World'))



const listaIntrebari = [
	{
		intrebare: "În ce an s-a născut Mozart?",
		variante: ["1756", "1820", "1843", "1789"],
		corect: 0
	},
	{
		intrebare: "Cărei trupe îi aparține albumul Abbey Road?",
		variante: ["The Beatles", "ABBA", "Pink Floyd", "Queen"],
		corect: 0
	},
	{
		intrebare:"Din ce cauză a murit Ciprian Porumbescu?",
		variante: ["Ciroză", "Tuberculoză", "Moarte naturală", "În urmă unei operații"],
		corect:1
	}
];




// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	
	console.log("CHESTIONAR");
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
	res.render('chestionar', {intrebari: listaIntrebari});
});


var listaRaspunsuri=[];

const fs=require('fs');

app.post('/rezultat-chestionar', (req, res) => {

	console.log("REZULTAT CHESTIONAR");
	fs.readFile('intrebari.json',(err,data) => {
		//if(err) throw err;
		var nur=0;
		var nr=0;
		var i=0;
		for(i in req.body)
		{
			console.log(listaIntrebari[parseInt(i.substring(1))].corect);
			//console.log(intrebari[0].corect)
			if(req.body[i]== listaIntrebari[parseInt(i.substring(1))].corect){
				nr++;

			}
		}

		console.log(listaRaspunsuri);
		console.log(nr);
		
		res.render('rezultat-chestionar', {raspunsuri: nr});
	});
});


app.get('/', (req,res) => {

	console.log("ACASA");
	

	if ( req.session.numeLogat!="admin")
				{ 
					res.render('index',{utilizator: req.cookies.utilizator});}
				else {
					
					res.render("indexadmin",{utilizator: req.cookies.utilizator});
				}
	

});




app.get('/autentificare',createAccountLimiter, (req, res) => {
	console.log("AUTENTIFICARE");
	
	//res.clearCookie(mesajEroare);
	res.render('autentificare',{mesajEroare:req.cookies.mesajEroare});
	console.log(req.cookies.mesajEroare);
}); 




app.post('/verificare-autentificare', (req, res) => {
	

	fs.readFile('utilizatori.json',(err,data) => {
		
		if(err) throw err;
		console.log("VERIFICARE AUTENTIFICARE");
		console.log("REQ BODY"+ req.body);
		var users=JSON.parse(data);
		var i=0;
		let ok=0;
		
		for(i in users.utilizatori) {
			if(req.body.utilizator==users.utilizatori[i].utilizator && req.body.parola==users.utilizatori[i].parola)
			{
				ok=1;
			}
			console.log(ok);
		}
		if(ok ==0){
			
			console.log("Nume utilizator sau parola incorecte");
			
			res.cookie('mesajEroare','Nume utilizator sau parola incorecte',{maxAge:1*60000});
		
			res.redirect('/autentificare');
			
		}
		else{
			console.log("Autentificare corecta!");
			req.session.numeLogat = req.body.utilizator;
			req.session.nume=req.body.nume;
			req.session.prenume=req.body.prenume;
			console.log(req.session.numeLogat);
			
			res.cookie('utilizator', req.body.utilizator,{maxAge:2*60000});
			res.redirect("/");
		}
	});
	
});




app.get('/delogare',  function (req, res, next)  {
	if (req.session) {
	  // delete session object
	  req.session.destroy(function (err) {
		if (err) {
		  return next(err);
		} else {

		  return res.redirect('/');
		}
	  });
	}
  });


  app.get('/creare-bd', (req,res) => {

	app.use(sqlinjection);

	var mysql = require('mysql');
	var con = mysql.createConnection({
	 host:"localhost",
	 user:"admin",
	 password:"admin"
	});
	
		con.connect(function(err) {
			  
			  if (err) throw err;
			  console.log("CONECTAT la MYSQL!");
		  
			  con.query("CREATE DATABASE cumparaturi", function (err, result) {
			
				if (err) throw err;
				console.log("BAZA DE DATE cumparaturi CREATA");
			  });
	
	
			  var sql = "CREATE TABLE cumparaturi.produse (nume VARCHAR(255), id VARCHAR(255))";
			  
			  con.query(sql, function (err, result) {
		
				if (err) throw err;
				console.log("TABEL produse CREAT");
	
			});
		});
	
		res.redirect('/');
		
	});
	

	
app.get('/stergere-bd', (req,res) => {

		var mysql = require('mysql');
		var con = mysql.createConnection({
		 host:"localhost",
		 user:"admin",
		 password:"admin"
		});
		
			con.connect(function(err) {
				  
				  if (err) throw err;
				  console.log("CONECTAT la MYSQL!");
			  
				  con.query("DROP DATABASE cumparaturi", function (err, result) {
				
					if (err) throw err;
					console.log("BAZA DE DATE cumparaturi stearsa");
				  });
		
		
				  
			});
		
			res.redirect('/');
			
		});
		


app.post('/inserare-bd', (req,res) => {

	app.use(sqlinjection);

	var mysql = require('mysql');
	console.log("2. Conectare BAZA DE DATE...");
	
	var con = mysql.createConnection({
	 host: "localhost",
	 user: "admin",
	  password: "admin",
	  database:"cumparaturi"
	});
	
	con.connect(function(err) {
  		
  		if (err) throw err;
  		console.log("CONECTAT la MYSQL!");
  	
		console.log(req.body.nume);
		console.log(req.body.id);
		
  		var sql = "INSERT INTO produse (nume,id) VALUES ('"+req.body.nume+"', '"+req.body.id+"')";
  		
  		con.query(sql, function (err, result) {
    
    		if (err) throw err;
    		console.log("produs ADAUGAT");

		});
	
	  });
	  
	  res.send(200, {});
	res.redirect('/');
	
});


app.get('/afisare-bd', (req,res) => {
	
	app.use(sqlinjection);
	var mysql = require('mysql');
	console.log("3. Conectare BAZA DE DATE...");
	

	var con = mysql.createConnection({
	 host: "localhost",
	 user: "admin",
	  password: "admin",
	  database:"cumparaturi"
	});
	

	con.connect(function(err) {
  		
  		if (err) throw err;
  		console.log("CONECTAT la MYSQL!");
		
  	    var final=[];
  		var sql = "SELECT * FROM produse";
  		
  		con.query(sql, function (err, result,fields) {
			
			if (err) throw err;
			else{

			var string=JSON.stringify(result);
        	var json =  JSON.parse(string);
			console.log('>> Produse: ', json);
			console.log('>> Nume Produs 1: ', json[0].nume);
			console.log("TEEEST",json[0]);
			
			for (var i in json)
				final.push(json[i]);
				
				res.render('index',{json:final});
				
			
			//console.log("Baza de date AFISATA");
			}
			
		});
		
  	});
	
	  
	
});






app.post('/adaugare_cos', function (req, res)  {
	app.use(sqlinjection);
	
	var mysql = require('mysql');
	console.log("3. Conectare BAZA DE DATE...");
	

	var con = mysql.createConnection({
	 host: "localhost",
	 user: "admin",
	  password: "admin",
	  database:"cumparaturi"
	});
	

	con.connect(function(err) {
  		
  		if (err) throw err;
  		console.log("CONECTAT la MYSQL!");
		
  	   
  		var sql = "SELECT * FROM produse";
  		
  		con.query(sql, function (err, result,fields) {
			
			if (err) throw err;
			else{

			var string=JSON.stringify(result);
        	var json =  JSON.parse(string);
			
			console.log(json[1].id);
			console.log("VAAAAL",req.body.id);
			
			for (var i in json)
				
				if(req.body.id==json[i].id )
				{
					req.session.id = req.body.id;
					res.cookie('id', req.body.id,{maxAge:2*60000});
					console.log(req.session.id);
					res.redirect('/');
				}
			}
	
			});
		});
  });


  app.get('/vizualizare_cos', (req, res) => {

	console.log("COS");
	
	var final=[];
	var mysql = require('mysql');
	console.log("3. Conectare BAZA DE DATE...");
	

	var con = mysql.createConnection({
	 host: "localhost",
	 user: "admin",
	  password: "admin",
	  database:"cumparaturi"
	});
	

	con.connect(function(err) {
  		
  		if (err) throw err;
  		console.log("CONECTAT la MYSQL!");
		
  	   
  		var sql = "SELECT * FROM produse";
  		
  		con.query(sql, function (err, result,fields) {
			
			if (err) throw err;
			else{

			var string=JSON.stringify(result);
        	var json =  JSON.parse(string);
			
			console.log(json[1].id);
			console.log(req.session.id);
			
			for (var i in json)
				
				if(req.cookies.id==json[i].id )
				{
					
					console.log(json[i].nume);
					final.push(json[i].nume);
					res.render('vizualizare_cos',{final:final});
				}
			}
	
			});
		});
  });
 


// Geting client IP
var getClientIp = function(req) {
	var ipAddress = req.connection.remoteAddress;
	if (!ipAddress) {
		return '';
	  }
	  // convert from "::ffff:192.0.0.1"  to "192.0.0.1"
  	if (ipAddress.substr(0, 7) == "::ffff:") {
    ipAddress = ipAddress.substr(7)
	}
	return ipAddress;
};

//Blocking Client IP, if it is in the blacklist
app.use(function(req, res, next) {
	var ipAddress = getClientIp(req);
	if(BLACKLIST.indexOf(ipAddress) === -1){
		next();
	  } else {
		res.send(ipAddress + ' IP nu este in whiteList')
	}
});


app.listen(port, () => console.log("Serverul rulează la adresa http://localhost:"));