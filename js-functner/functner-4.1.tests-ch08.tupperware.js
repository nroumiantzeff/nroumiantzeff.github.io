"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch08.md

logger("***********************************************************************" + "\n" +
	"08. My First Functor **************************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The Mighty Container

(function (){

/*
	class Container {
		constructor(x) {
			this.$value = x;
		}
		static of(x) {
			return new Container(x);
		}
	}
*/

	Container(of)(3)
		(inspect)(assert("Container(3)", "Container(of)(3)", x => logger(x)));
	// Container(3)

	Container(of)('hotdogs')
		(inspect)(assert("Container('hotdogs')", "Container(of)('hotdogs')", x => logger(x)));
	// Container('hotdogs')

	Container(of)(Container(of)({ name: 'yoda' }))
		(inspect)(assert("Container(Container({'name':'yoda'}))", "Container(of)(Container(of)({ name: 'yoda' }))", x => logger(x)));
	// Container(Container({'name':'yoda'}))
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// My First Functor

(function (){

/*
	// (a -> b) -> Container a -> Container b
	Container.prototype.map = function (f) {
		return Container.of(f(this.$value));
	};
*/

	Container(of)(2)(map)(x => x + 2)
		(inspect)(assert("Container(4)", "Container(2)(map)(x => x + 2);", x => logger(x)));
	// Container(4)

	Container(of)('flamethrowers')(map)(s => s.toUpperCase())
		(inspect)(assert("Container('FLAMETHROWERS')", "Container('flamethrowers')(map)(s => s.toUpperCase());", x => logger(x)));
	// Container('FLAMETHROWERS')

	Container(of)('bombs')(map)(append(' away'))(map)(prop('length'))
		(inspect)(assert("Container(10)", "Container('bombs')(map)(append(' away'))(map)(prop('length'));", x => logger(x)));
	// Container(10)
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Schrödinger's Maybe

(function (){

/*
	class Maybe {
		static of(x) {
			return new Maybe(x);
		}
		get isNothing() {
			return this.$value === null || this.$value === undefined;
		}
		constructor(x) {
			this.$value = x;
		}
		map(fn) {
			return this.isNothing ? this : Maybe.of(fn(this.$value));
		}
		inspect() {
			return this.isNothing ? 'Nothing' : `Just(${inspect(this.$value)})`;
		}
	}
*/

	Maybe(of)('Malkovich Malkovich')(map)(match(/a/ig))
		(inspect)(assert("Just(true)", "Maybe('Malkovich Malkovich')(map)(match(/a/ig));", x => logger(x)));
	// Just(true)

	Maybe(of)(null)(map)(match(/a/ig))
		(inspect)(assert("Nothing", "Maybe(null)(map)(match(/a/ig));", x => logger(x)));
	// Nothing

	Maybe(of)({ name: 'Boris' })(map)(prop('age'))(map)(add(10))
		(inspect)(assert("Nothing", "Maybe({ name: 'Boris' })(map)(prop('age'))(map)(add(10));", x => logger(x)));
	// Nothing

	Maybe(of)({ name: 'Dinah', age: 14 })(map)(prop('age'))(map)(add(10))
		(inspect)(assert("Just(24)", "Maybe({ name: 'Dinah', age: 14 })(map)(prop('age'))(map)(add(10));", x => logger(x)));
	// Just(24)
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Use Cases

(function (){

	// safeHead :: [a] -> Maybe(a)
	const safeHead = xs => Maybe(of)(xs[0]);

	// streetName :: Object -> Maybe String
	const streetName = compose(map(prop('street')), safeHead, prop('addresses'));

	streetName({ addresses: [] })
		(inspect)(assert("Nothing", "streetName({ addresses: [] });", x => logger(x)));
	// Nothing

	streetName({ addresses: [{ street: 'Shady Ln.', number: 4201 }] })
		(inspect)(assert("Just('Shady Ln.')", "streetName({ addresses: [{ street: 'Shady Ln.', number: 4201 }] });", x => logger(x)));
	// Just('Shady Ln.')

	// withdraw :: Number -> Account -> Maybe(Account)
	const withdraw = curry((amount, { balance }) => Maybe(of)(balance >= amount ? { balance: balance - amount } : null));

	// This function is hypothetical, not implemented here... nor anywhere else.
	// updateLedger :: Account -> Account 
	const updateLedger = account => account;

	// remainingBalance :: Account -> String
	const remainingBalance = ({ balance }) => `Your balance is $${balance}`;

	// finishTransaction :: Account -> String
	const finishTransaction = compose(remainingBalance, updateLedger);

	// getTwenty :: Account -> Maybe(String)
	const getTwenty = compose(map(finishTransaction), withdraw(20));

	getTwenty({ balance: 200.00 })
	(inspect)(assert("Just('Your balance is $180')", "getTwenty({ balance: 200.00 });", x => logger(x)));
	// Just('Your balance is $180')

	getTwenty({ balance: 10.00 })
		(inspect)(assert("Nothing", "getTwenty({ balance: 10.00 });", x => logger(x)));
	// Nothing


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Releasing the Value

/*
	// maybe :: b -> (a -> b) -> Maybe a -> b
	const maybe = curry((v, f, m) => {
		if (m.isNothing) {
			return v;
		}
		return f(m.$value);
	});
*/

	// getTwentyMaybe :: Account -> String
	const getTwentyMaybe = compose(maybe('You\'re broke!', finishTransaction), withdraw(20));

		assert("'Your balance is $180'", "getTwentyMaybe({ balance: 200.00 });", x => logger(x))(inspect(
	getTwentyMaybe({ balance: 200.00 })
		))
	// 'Your balance is $180'

		assert("'You\'re broke!'", "getTwentyMaybe({ balance: 10.00 });", x => logger(x))(inspect(
	getTwentyMaybe({ balance: 10.00 })
		))
	// 'You\'re broke!'
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pure Error Handling

(function (){

/*
	class Either {
		static of(x) {
			return new Right(x);
		}
		constructor(x) {
			this.$value = x;
		}
	}
	class Left extends Either {
		map(f) {
			return this;
		}
		inspect() {
			return `Left(${inspect(this.$value)})`;
		}
	}
	class Right extends Either {
		map(f) {
			return Either.of(f(this.$value));
		}
		inspect() {
			return `Right(${inspect(this.$value)})`;
		}
	}
	const left = x => new Left(x);
*/

	Either(of)('rain')(map)(str => `b${str}`)
		(inspect)(assert("Right('brain')", "Either('rain')(map)(str => `b${str}`);", x => logger(x)));
	// Right('brain')

	left('rain')(map)(str => `It's gonna ${str}, better bring your umbrella!`)
		(inspect)(assert("Left('rain')", "left('rain')(map)(str => `It's gonna ${str}, better bring your umbrella!`);", x => logger(x)));
	// Left('rain')

	Either(of)({ host: 'localhost', port: 80 })(map)(prop('host'))
		(inspect)(assert("Right('localhost')", "Either({ host: 'localhost', port: 80 })(map)(prop('host'));", x => logger(x)));
	// Right('localhost')

	left('rolls eyes...')(map)(prop('host'))
		(inspect)(assert("Left('rolls eyes...')", "left('rolls eyes...')(map)(prop('host'));", x => logger(x)));
	// Left('rolls eyes...')

})();

(function (){

/*
	const moment = require('moment');
*/
	//mock
	function moment(string){
		if(string == null){
			const now = new Date(2015, 0, 1);
			now.diff = date => Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365));
			return now;
		}
		const parts = string.split("-");
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const date = new Date(year, month, day);
		if(year === date.getFullYear() && month === date.getMonth() && day === date.getDate()){
			date.isValid = () => true;
			return date;
		}
		return {
			isValid: () => false,
		};
	}

	// getAge :: Date -> User -> Either(String, Number)
	const getAge = curry((now, user) => {
		const birthDate = moment(user.birthDate, 'YYYY-MM-DD');
		return birthDate.isValid()
			? Either(of)(now.diff(birthDate, 'years'))
			: left('Birth date could not be parsed');
	});

	getAge(moment())({ birthDate: '2005-12-12' })
		(inspect)(assert("Right(9)", "getAge(moment())({ birthDate: '2005-12-12' });", x => logger(x)));
	// Right(9)

	getAge(moment())({ birthDate: 'July 4, 2001' })
		(inspect)(assert("Left('Birth date could not be parsed')", "getAge(moment())({ birthDate: 'July 4, 2001' });", x => logger(x)));
	// Left('Birth date could not be parsed')

	// fortune :: Number -> String
	const fortune = compose(append('If you survive, you will be '), toString, add(1));

	// zoltar :: User -> Either(String, _)
	const zoltar = compose(map(console.log), map(fortune), getAge(moment()));

	// 'If you survive, you will be 10'
	zoltar({ birthDate: '2005-12-12' })
		(inspect)(assert("Right(undefined)", "zoltar({ birthDate: '2005-12-12' });", x => logger(x)));
	// Right(undefined)

	zoltar({ birthDate: 'balloons!' })
		(inspect)(assert("Left('Birth date could not be parsed')", "zoltar({ birthDate: 'balloons!' });", x => logger(x)));
	// Left('Birth date could not be parsed')

/*
	// either :: (a -> c) -> (b -> c) -> Either a b -> c
	const either = curry((f, g, e) => {
		let result;
		switch (e.constructor) {
			case Left:
				result = f(e.$value);
			break;
			case Right:
				result = g(e.$value);
			break;
			// No Default
		}
		return result;
	});
*/

	// zoltarEither :: User -> _
	const zoltarEither = compose(console.log, either(id, fortune), getAge(moment()));

	// 'If you survive, you will be 10'
		assert("undefined", "zoltarEither({ birthDate: '2005-12-12' });", x => logger(x))(inspect(
	zoltarEither({ birthDate: '2005-12-12' })
		));
	// undefined

	// 'Birth date could not be parsed'
		assert("undefined", "zoltarEither({ birthDate: 'balloons!' });", x => logger(x))(inspect(
	zoltarEither({ birthDate: 'balloons!' })
		));
	// undefined
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Old McDonald Had Effects...

/*
class IO {
  constructor(io) {
    this.unsafePerformIO = io;
  }

  map(fn) {
    return new IO(compose(fn, this.unsafePerformIO));
  }
}
*/

(function(){

	//mock
	const window = {
		innerWidth: 1430,
		location: {
			href: "http://localhost:8000/blog/posts",
		},
	};

	// ioWindow :: IO Window
	const ioWindow = IO()(() => window);

	ioWindow(map)(win => win.innerWidth)
		(inspect)(assert("IO(1430)", "ioWindow(map)(win => win.innerWidth);", x => logger(x)));
	// IO(1430)

	ioWindow(map)(prop('location'))(map)(prop('href'))(map)(split('/'))
		(inspect)(assert("IO(['http:','','localhost:8000','blog','posts'])", "ioWindow(map)(prop('location'))(map)(prop('href'))(map)(split('/'));", x => logger(x)));
	// IO(['http:','','localhost:8000','blog','posts'])

	const document = {
		querySelectorAll: selector => [{
			innerHTML: "I am some inner html",
		}],
	};

	// $ :: String -> IO [DOM]
	const $ = selector => IO()(() => document.querySelectorAll(selector));

	$('#myDiv')(map)(head)(map)(div => div.innerHTML)
		(inspect)(assert("IO('I am some inner html')", "$('#myDiv')(map)(head)(map)(div => div.innerHTML);", x => logger(x)));
	// IO('I am some inner html')
})();

(function(){

	//mock
	const window = {
		location: {
			href: "http://localhost:8000/blog/posts?id=1234&searchTerm=wafflehouse",
		},
	};

	// url :: IO String
	const url = IO()(() => window.location.href);

	// toPairs :: String -> [[String]]
	const toPairs = compose(map(split('=')), split('&'));

	// params :: String -> [[String]]
	const params = compose(toPairs, last, split('?'));

	// findParam :: String -> IO Maybe [String]
	const findParam = key => map(compose(Maybe(of), filter(compose(eq(key), head)), params), url);

	// -- Impure calling code ----------------------------------------------

	// run it by calling $value()!
	findParam('searchTerm')(unsafePerformIO)()
		(inspect)(assert("Just([['searchTerm','wafflehouse']])", "findParam('searchTerm')(unsafePerformIO)();", x => logger(x)));
	// Just([['searchTerm','wafflehouse']])
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Asynchronous Tasks

(function(){
	// -- Node readFile example ------------------------------------------

/*
	const fs = require('fs');
*/
	//mock
	const fs = {
		readFile: function(filename, callback){
			setTimeout(function(){
				return callback(null, 'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.\n...');
			}, 1000);
		},
	};

	// readFile :: String -> Task Error String
	const readFile = filename => Task()((reject, result) => {
		fs.readFile(filename, (err, data) => (err ? reject(err) : result(data)));
	});

		const reject = error => assert('null', "readFile('metamorphosis')(map)(split('\\n'))(map)(head)(fork)(reject, result)", x => logger(x))(inspect(error));
		const result = data => assert("'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.'", "readFile('metamorphosis')(map)(split('\\n'))(map)(head)(fork)(reject, result)", x => logger(x))(inspect(data));
	readFile('metamorphosis')(map)(split('\n'))(map)(head)(fork)(reject, result)
	// 'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.'
})();

(function(){
	// -- jQuery getJSON example -----------------------------------------

	//mock
	const $ = {
		getJSON: (function(){
			var fail = null;
			function getJSON(url, params, result){
				setTimeout(function(){
					return result({ id: 10, title: 'Family Matters ep 15'});
				}, 1000);
				return getJSON;
			}
			getJSON.fail = function(reject){
				fail = reject;
			};
			return getJSON;
		})(),
	};

	// getJSON :: String -> {} -> Task Error JSON
	const getJSON = curry((url, params) => Task()((reject, result) => {
		$.getJSON(url, params, result).fail(reject);
	}));

		const reject = error => assert('null', "getJSON('/video', { id: 10 })(map)(prop('title'));", x => logger(x))(inspect(error));
		const result = data => assert("'Family Matters ep 15'", "getJSON('/video', { id: 10 })(map)(prop('title'));", x => logger(x))(inspect(data));
	getJSON('/video', { id: 10 })(map)(prop('title'))(fork)(reject, result)
	// 'Family Matters ep 15'

})();

(function(){
	// -- Default Minimal Context ----------------------------------------

	// We can put normal, non futuristic values inside as well
	Task(of)(3)(map)(three => three + 1)
		(inspect)(assert("Task(4)", "Task(3)(map)(three => three + 1);", x => logger(x)));
	// Task(4)

	Task(of)(3)(map)(three => three + 1)
		(map)(assert(4, "Task(3)(map)(three => three + 1)(fork)();", x => logger(x)))
	(fork)();
	// 4

})();

(function(){

	//mock
	const blogTemplate = `<htm>
		<body>
			<h1>Posts</h1>
			<ul handlebar="repeat">
				<li>
					<div><span handlebar="date"></span><span handlebar="title"></span></div>
					<div handlebar="content"></div>
				</li>
			</ul>
		</body>	
	</html>`;

	//mock
	const Handlebars = {
		compile: function(blogTemplate){
			return function(json){
				return `<htm>
					<body>
						<h1>Posts</h1>
						<ul handlebar="repeat">
							<li>
								<div><span>2015-01-01</span><span>Steppin'out</span></div>
								<div>Last night a DJ saved my life...</div>
							</li>
							<li>
								<div><span>2015-03-21</span><span>What's up</span></div>
								<div>Going to the swimming-pool...</div>
							</li>
						</ul>
					</body>	
				</html>`;
			};
		},
	};

	//mock
	const $ = function(selector){
		return {
			html: function(text){
				assert("'#main'", "blog({})(fork)(reject, result);", x => logger(x))(inspect(selector));
			},
			show: function(){
				assert("'#spinner'", "$('#spinner').show();", x => logger(x))(inspect(selector));
			},
		};
	};

	$.getJSON = (function(){
		var fail = null;
		function getJSON(url, params, result){
			setTimeout(function(){
				return result([
					{ date: "2015-03-21", title: "What's up", content: "Going to the swimming-pool...", },
					{ date: "2015-01-01", title: "Steppin'out", content: "Last night a DJ saved my life...", },
				]);
			}, 1000);
			return getJSON;
		}
		getJSON.fail = function(reject){
			fail = reject;
		};
		return getJSON;
	})();

	// getJSON :: String -> {} -> Task Error JSON
	const getJSON = curry((url, params) => Task()((reject, result) => {
		$.getJSON(url, params, result).fail(reject);
	}));


	// -- Pure application -------------------------------------------------
	// blogPage :: Posts -> HTML
	const blogPage = Handlebars.compile(blogTemplate);

	// renderPage :: Posts -> HTML
	const renderPage = compose(blogPage, sortBy(prop('date')));

	// blog :: Params -> Task Error HTML
	const blog = compose(map(renderPage), getJSON('/posts'));


	// -- Impure calling code ----------------------------------------------
	blog({})(fork)(
		error => $('#error').html(error.message),
		page => $('#main').html(page),
	);

	$('#spinner').show();
})();

(function(){

	// Postgres.connect :: Url -> IO DbConnection
	// runQuery :: DbConnection -> ResultSet
	// readFile :: String -> Task Error String

	//mock
	function DbConnection(connection){
		this.connection = connection;
	}
	
	//mock
	const Postgres = {
		// Postgres.connect :: Url -> IO DbConnection
		connect: function(connection){
			return IO()(function(){
				return new DbConnection(connection);
			});
		},
	};
	
	//mock
	const fs = {
		readFile: function(filename, callback){
			setTimeout(function(){
				return callback(null, '{"uname":"john","pass":"SwXGT6E3","host":"123.12.10.75","db":"accounts"}');
			}, 1000);
		},
	};

	// readFile :: String -> Task Error String
	const readFile = filename => Task()((reject, result) => {
		fs.readFile(filename, (err, data) => (err ? reject(err) : result(data)));
	});

	const runQuery = function(dbQuery){
		assert("'db:pg://john:SwXGT6E3@123.12.10.755432/accounts'", "either(console.log, compose(apply(id), apply(unsafePerformIO), compose(map(runQuery))))", x => logger(x))(inspect(dbQuery.connection));
	};

	const logErr = function(message){
		return function(error){
			assert("null", "logErr('couldn\'t read file')", x => logger(x))(inspect(error));
		};
	};

	// -- Pure application -------------------------------------------------

	// dbUrl :: Config -> Either Error Url
	const dbUrl = ({ uname, pass, host, db }) => {
		if (uname && pass && host && db) {
			return Either(of)(`db:pg://${uname}:${pass}@${host}5432/${db}`);
		}
		return left(Error('Invalid config!'));
	};

	// connectDb :: Config -> Either Error (IO DbConnection)
	const connectDb = compose(map(Postgres.connect), dbUrl);

	// getConfig :: Filename -> Task Error (Either Error (IO DbConnection))
	const getConfig = compose(map(compose(connectDb, function(x){
		return JSON.parse(x);
	})), readFile);

	// -- Impure calling code ----------------------------------------------

	getConfig('db.json')(fork)(
		logErr('couldn\'t read file'),
		either(console.log, compose(apply(), interpose(map(runQuery), unsafePerformIO))),
	);

})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A Spot of Theory

(function(){

/*
	// identity
	map(id) === id;

	// composition
	compose(map(f), map(g)) === map(compose(f, g));
*/

	const idLaw1 = map(id);
	const idLaw2 = id;

	idLaw1(Identity(of)(2))
		(inspect)(assert("Identity(2)", "idLaw1(Identity(of)(2))", x => logger(x)));
	// Identity(2)
	
	idLaw2(Identity(of)(2))
		(inspect)(assert("Identity(2)", "idLaw2(Identity(of)(2))", x => logger(x)));
	// Identity(2)

	const compLaw1 = compose(map(append(' world')), map(append(' cruel')));
	const compLaw2 = map(compose(append(' world'), append(' cruel')));

	compLaw1(Identity(of)('Goodbye'))
		(inspect)(assert("Identity('Goodbye cruel world')", "compLaw1(Identity(of)('Goodbye'))", x => logger(x)));
	// Identity('Goodbye cruel world')
	
	compLaw2(Identity(of)('Goodbye'))
		(inspect)(assert("Identity('Goodbye cruel world')", "compLaw2(Identity(of)('Goodbye'))", x => logger(x)));
	// Identity('Goodbye cruel world')

	// topRoute :: String -> Maybe String
	const topRoute = compose(Maybe(of), reverse);

	// bottomRoute :: String -> Maybe String
	const bottomRoute = compose(map(reverse), Maybe(of));

	topRoute('hi')
		(inspect)(assert("Just('ih')", "topRoute('hi')", x => logger(x)));
	// Just('ih')

	bottomRoute('hi')
		(inspect)(assert("Just('ih')", "bottomRoute('hi')", x => logger(x)));
	// Just('ih')

})();

// Functor can stack

(function(){
	const nested = Task(of)([Either(of)('pillows'), left('no sleep for you')]);

	map(map(map(toUpperCase)), nested)
		(inspect)(assert("Task([Right('PILLOWS'),Left('no sleep for you')])", "map(map(map(toUpperCase)), nested)", x => logger(x)));
	// Task([Right('PILLOWS'),Left('no sleep for you')])
})();

/*
class Compose {
	constructor(fgx) {
		this.getCompose = fgx;
	}
	static of(fgx) {
		return new Compose(fgx);
	}
	map(fn) {
		return new Compose(map(map(fn), this.getCompose));
	}
}
*/

(function(){
	const tmd = Task(of)(Maybe(of)('Rock over London'));

	const ctmd = Compose(of)(tmd);

	const ctmd2 = map(append(', rock on, Chicago'), ctmd);
		ctmd2(inspect)(assert("Compose(Task(Just('Rock over London, rock on, Chicago')))", "map(append(', rock on, Chicago'), ctmd)", x => logger(x)));
	// Compose(Task(Just('Rock over London, rock on, Chicago')))


	ctmd2(getCompose)
		(inspect)(assert("Task(Just('Rock over London, rock on, Chicago'))", "ctmd2(getCompose)", x => logger(x)));
	// Task(Just('Rock over London, rock on, Chicago'))

})();

logger("***********************************************************************" + "\n");
