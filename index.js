var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 1137));

app.use(express.static(_dirname + '/TeamBingo'));

app.get('/', function(request, response){
	response.render('bingo-oot')
});

app.listen(app.get('port'), function(){
	console.log('Peer connected on port ', app.get('port'));
});