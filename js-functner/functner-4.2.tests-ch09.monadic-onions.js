"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch09.md

logger("***********************************************************************" + "\n" +
	"09. Monadic Onions ****************************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pointy Functor Factory

(function(){

	IO(of)('tetris')(map)(concat(' master'))
		(inspect)(assert("IO('tetris master')", "IO(of)('tetris')(map)(concat(' master'))", x => logger(x)));
	// IO('tetris master')

	Maybe(of)(1336)(map)(add(1))
		(inspect)(assert("Just(1337)", "Maybe(of)(1336)(map)(add(1))", x => logger(x)));
	// Just(1337)

	Task(of)([{ id: 2 }, { id: 3 }])(map)(map(prop('id')))
		(inspect)(assert("Task([2,3])", "Task(of)([{ id: 2 }, { id: 3 }])(map)(map(prop('id')))", x => logger(x)));
	// Task([2,3])

	Either(of)('The past, present and future walk into a bar...')(map)(concat('it was tense.'))
		(inspect)(assert("Right('The past, present and future walk into a bar...it was tense.')", "Either(of)('The past, present and future walk into a bar...')(map)(concat('it was tense.'))", x => logger(x)));
	// Right('The past, present and future walk into a bar...it was tense.')
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Mixing Metaphors

(function(){

/*
	const fs = require('fs');
*/
	// mock
	const fs = {
		readFileSync: function(filename, encoding){
			return '[core]\nrepositoryformatversion = 0\n';
		},
	};

	// readFile :: String -> IO String
	const readFile = filename => IO()(() => fs.readFileSync(filename, 'utf-8'));

	// print :: String -> IO String
	const print = x => IO()(() => {
		console.log(x);
		return x;
	});

	// cat :: String -> IO (IO String)
	const cat = compose(map(print), readFile);

	cat('.git/config')
		(inspect)(assert("IO(IO('[core]\\nrepositoryformatversion = 0\\n'))", "cat('.git/config')", x => logger(x)));
	// IO(IO('[core]\nrepositoryformatversion = 0\n'))

/*
	// cat :: String -> IO (IO String)
	const cat = compose(map(print), readFile);
*/

	// catFirstChar :: String -> IO (IO String)
	const catFirstChar = compose(map(map(head)), cat);

	catFirstChar('.git/config')
		(inspect)(assert("IO(IO('['))", "catFirstChar('.git/config')", x => logger(x)));
	// IO(IO('['))

})();


(function(){

	// safeProp :: Key -> {Key: a} -> Maybe a
	const safeProp = curry((x, obj) => Maybe(of)(obj[x]));

	// safeHead :: [a] -> Maybe a
	const safeHead = safeProp(0);

	// firstAddressStreet :: User -> Maybe (Maybe (Maybe Street))
	const firstAddressStreet = compose(
		map(map(safeProp('street'))),
		map(safeHead),
		safeProp('addresses'),
	);

	firstAddressStreet({
		addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }],
	})
		(inspect)(assert("Just(Just(Just({'name':'Mulburry','number':8402})))", "firstAddressStreet({ addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }], })", x => logger(x)));
	// Just(Just(Just({'name':'Mulburry','number':8402})))

})();

(function(){

	const mmo = Maybe(of)(Maybe(of)('nunchucks'));
		mmo(inspect)(assert("Just(Just('nunchucks'))", "Maybe(of)(Maybe(of)('nunchucks'))", x => logger(x)));
	// Just(Just('nunchucks'))

	mmo(join)()
		(inspect)(assert("Just('nunchucks')", "mmo(join)()", x => logger(x)));
	// Just('nunchucks')

	const ioio = IO()(IO()('pizza'));
		ioio(inspect)(assert("IO(IO('pizza'))", "IO()(IO()('pizza'))", x => logger(x)));
	// IO(IO('pizza'))

	ioio(join)()
		(inspect)(assert("IO('pizza')", "ioio(join)()", x => logger(x)));
	// IO('pizza')

	const ttt = Task(of)(Task(of)(Task(of)('sewers')));
		ttt(inspect)(assert("Task(Task(Task('sewers')))", "Task(of)(Task(of)(Task(of)('sewers')))", x => logger(x)));
	// Task(Task(Task('sewers')))

	ttt(join)()
		(inspect)(assert("Task(Task('sewers'))", "ttt(join)()", x => logger(x)));
	// Task(Task('sewers'))

})();

(function(){

	// safeProp :: Key -> {Key: a} -> Maybe a
	const safeProp = curry((x, obj) => Maybe(of)(obj[x]));

	// safeHead :: [a] -> Maybe a
	const safeHead = safeProp(0);

/*
	Maybe.prototype.join = function join() {
		return this.isNothing() ? Maybe.of(null) : this.$value;
	};

	// join :: Monad m => m (m a) -> m a
	const join = mma => mma.join();
*/

	// firstAddressStreet :: User -> Maybe Street
	const firstAddressStreet = compose(
		join,
		map(safeProp('street')),
		join,
		map(safeHead),
		safeProp('addresses'),
	);

	firstAddressStreet({
		addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }],
	})
		(inspect)(assert("Just({'name':'Mulburry','number':8402})", "firstAddressStreet({ addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }], })", x => logger(x)));
	// Just({'name':'Mulburry','number':8402})

})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// My Chain Hits My Chest

/*
	// chain :: Monad m => (a -> m b) -> m a -> m b
	const chain = curry((f, m) => m.map(f).join());
	// or
	// chain :: Monad m => (a -> m b) -> m a -> m b
	const chain = f => compose(join, map(f));
*/

(function(){

	// safeProp :: Key -> {Key: a} -> Maybe a
	const safeProp = curry((x, obj) => Maybe(of)(obj[x]));

	// safeHead :: [a] -> Maybe a
	const safeHead = safeProp(0);

/*
	// map/join
	const firstAddressStreet = compose(
		join,
		map(safeProp('street')),
		join,
		map(safeHead),
		safeProp('addresses'),
	);
*/

	// chain
	const firstAddressStreet = compose(
		chain(safeProp('street')),
		chain(safeHead),
		safeProp('addresses'),
	);

	firstAddressStreet({
		addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }],
	})
		(inspect)(assert("Just({'name':'Mulburry','number':8402})", "firstAddressStreet({ addresses: [{ street: { name: 'Mulburry', number: 8402 }, postcode: 'WC2N' }], })", x => logger(x)));
	// Just({'name':'Mulburry','number':8402})
})();

(function(){

	// mock
	const localStorage = {
		getItem: function(key){
			return { "preferences": '{"background-color": "green"}' }[key];
		},
	};

	// mock
	const jQuery = function(selection){
		return {
			css: function(props){
				return '<div style="background-color: ' + props["background-color"] + '"/>';
			},
		};
	};

	// log :: a -> IO a
	const log = x => IO()(() => {console.log(x); return x; });

	// readFile :: String -> IO String
	const readFile = filename => IO()(() => fs.readFileSync(filename, 'utf-8'));

	// setStyle :: Selector -> CSSProps -> IO DOM
	const setStyle = curry((sel, props) => IO()(() => jQuery(sel).css(props)));

	// getItem :: String -> IO String
	const getItem = key => IO()(() => localStorage.getItem(key));

	// map/join
	// applyPreferences1 :: String -> IO DOM
	const applyPreferences1 = compose(
		join,
		map(setStyle('#main')),
		join,
		map(log),
		map(JSON.parse),
		getItem,
	);
		assert("'<div style=\"background-color: green\"/>'", "applyPreferences1('preferences')(unsafePerformIO)()", x => logger(x))(inspect(
	applyPreferences1('preferences')(unsafePerformIO)()
		));
	// <div style="background-color: 'green'"/>

	// chain
	// applyPreferences2 :: String -> IO DOM
	const applyPreferences2 = compose(
		chain(setStyle('#main')),
		chain(log),
		map(JSON.parse),
		getItem,
	);
		assert("'<div style=\"background-color: green\"/>'", "applyPreferences2('preferences')(unsafePerformIO)()", x => logger(x))(inspect(
	applyPreferences2('preferences')(unsafePerformIO)()
		));
	// <div style="background-color: 'green'"/>

})();

(function(){

	// IOLift: simpler than IO and the checks are performed before unsafePerformIO 

	// mock
	const localStorage = {
		getItem: function(key){
			return { "preferences": '{"background-color": "green"}' }[key];
		},
	};

	// mock
	const jQuery = function(selection){
		return {
			css: function(props){
				return '<div style="background-color: ' + props["background-color"] + '"/>';
			},
		};
	};

/*
	// log :: a -> IO a
	const log = x => IO()(() => {
		console.log(x);
		return x;
	});
*/
	// log :: IOLifted (String -> String)
	const log = IOLift(lift)(x => {
		console.log(x);
		return x;
	});

/*
	// readFile :: String -> IO String
	const readFile = filename => IO()(() => fs.readFileSync(filename, 'utf-8'));
*/
	// readFile :: IOLifted (String -> String)
	const readFile = IOLift(lift)(filename => fs.readFileSync(filename, 'utf-8'));

/*
	// setStyle :: Selector -> CSSProps -> IO DOM
	const setStyle = curry((sel, props) => IO(of)(() => jQuery(sel).css(props)));
*/
	// setStyle :: Selector -> IOLifted (CSSProps -> DOM)
	const setStyle = sel => IOLift(lift)(props => jQuery(sel).css(props));

/*
	// getItem :: String -> IO String
	const getItem = key => IO()(() => localStorage.getItem(key));
*/
	// getItem :: IOLifted (String -> String)
	const getItem =  IOLift(lift)(key => localStorage.getItem(key));

/*
	// applyPreferences :: String -> IO DOM
	const applyPreferences = compose(
		join,
		map(setStyle('#main')),
		join,
		map(log),
		map(JSON.parse),
		getItem,
	);
*/

	// map
	// applyPreferences3 :: String -> IOLift DOM
	const applyPreferences3 = map(
		setStyle('#main'),
		log,
		JSON.parse,
		getItem,
	)(unlift);

		assert("'<div style=\"background-color: green\"/>'", "applyPreferences3('preferences')(unsafePerformIO)()", x => logger(x))(inspect(
	applyPreferences3('preferences')(unsafePerformIO)()
		));
	// <div style="background-color: 'green'"/>

	// transmap
	// applyPreferences4 :: String -> IOLift DOM
	const applyPreferences4 = transmap(
		getItem,
		JSON.parse,
		log,
		setStyle('#main'),
	)(unlift);

		assert("'<div style=\"background-color: green\"/>'", "applyPreferences4('preferences')(unsafePerformIO)()", x => logger(x))(inspect(
	applyPreferences4('preferences')(unsafePerformIO)()
		));
	// <div style="background-color: 'green'"/>

})();

(function(){

	// mock
	const $ = {
		getJSON: (function(){
			var fail = null;
			function getJSON(url, params){
				if(url === '/authenticate' && params.username === 'stale' && params.password === 'crackers'){
					return { id: 10 };
				}
				if(url === '/friends' && params.user_id === 10){
					return [{'name':'Seimith','id':14},{'name':'Ric','id':39}];
				}
			}
			getJSON.fail = function(reject){
				fail = reject;
			};
			return getJSON;
		})(),
	};

	// getJSON :: Url -> Params -> Task JSON
	const getJSON = curry((url, params) => Task()($.getJSON(url, params)));

	getJSON('/authenticate', { username: 'stale', password: 'crackers' })
		(chain)(user => getJSON('/friends', { user_id: user.id }))
			(inspect)(assert("Task([{'name':'Seimith','id':14},{'name':'Ric','id':39}])", "getJSON('/authenticate', { username: 'stale', password: 'crackers' })(chain)(user => getJSON('/friends', { user_id: user.id }))", x => logger(x)));
	// Task([{'name':'Seimith','id':14},{'name':'Ric','id':39}])
})();

(function(){

	// mock
	function querySelector(selector){
		if(selector === 'input.username'){
			return IO()(function(){
				return { value: 'Olivia' };
			});
		}
		if(selector === 'input.email'){
			return IO()(function(){
				return { value: 'olivia@tremorcontrol.net' };
			});
		}
	}

	// querySelector :: Selector -> IO DOM
	querySelector('input.username')
		(chain)(({ value: uname }) => querySelector('input.email')
			(chain)(({ value: email }) => IO(of)(`Welcome ${uname} prepare for spam at ${email}`)))
				(inspect)(assert("IO('Welcome Olivia prepare for spam at olivia@tremorcontrol.net')", "querySelector('input.username')(chain)(({ value: uname }) => querySelector('input.email')(chain)(({ value: email }) => IO(of)(`Welcome ${uname} prepare for spam at ${email}`)))", x => logger(x)));
	// IO('Welcome Olivia prepare for spam at olivia@tremorcontrol.net')
})();

(function(){

	Maybe(of)(3)
		(chain)(three => Maybe(of)(2)(map)(add(three)))
			(inspect)(assert("Just(5)", "Maybe(of)(3)(chain)(three => Maybe(of)(2)(map)(add(three)))", x => logger(x)));
	// Just(5)
})();

(function(){

	// safeProp :: Key -> {Key: a} -> Maybe a
	const safeProp = curry((x, obj) => Maybe(of)(obj[x]));

	Maybe(of)(null)
		(chain)(safeProp('address'))
		(chain)(safeProp('street'))
			(inspect)(assert("Nothing", "Maybe(of)(null)(chain)(safeProp('address'))(chain)(safeProp('street'))", x => logger(x)));
	// Nothing
})();

(function(){

	// mock
	function querySelector(selector){
		if(selector === 'input.username'){
			return IO()(function(){
				return { value: 'Olivia' };
			});
		}
		if(selector === 'input.email'){
			return IO()(function(){
				return { value: 'olivia@tremorcontrol.net' };
			});
		}
	}

	// querySelector :: Selector -> IO DOM
	querySelector('input.username')(chain)(({ value: uname }) =>
		querySelector('input.email')(map)(({ value: email }) =>
			`Welcome ${uname} prepare for spam at ${email}`))
				(inspect)(assert("IO('Welcome Olivia prepare for spam at olivia@tremorcontrol.net')", "querySelector('input.username')(chain)(({ value: uname }) => querySelector('input.email')(map)(({ value: email }) => `Welcome ${uname} prepare for spam at ${email}`))", x => logger(x)));
	// IO('Welcome Olivia prepare for spam at olivia@tremorcontrol.net')
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Power Trip

(function(){

	// mock
	const fs = {
		readFile: function(filename, callback){
			setTimeout(function(){
				return callback(null, 'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.\n...');
			}, 1000);
		},
	};

	// mock
	const $ = {
		post: function(url, params){
			if(url === '/uploads'){
				params.success('200 OK');
			}
			else{
				params.error('403 file not found');
			}
		},
	};

	// readFile :: Filename -> Either String (Task Error String)
	const readFile = filename => !filename? left('You need a filename!'): Either()(Task()((reject, result) => {
		fs.readFile(filename, (err, data) => (err ? reject(err) : result(data)));
	}));

	// httpPost :: String -> String -> Task Error JSON
	const httpPost = url => content => Task()((reject, result) => {
		$.post(url, { data: content, error: reject,  success: result, });
	});

	// upload :: String -> Either String (Task Error JSON)
	const upload = compose(map(chain(httpPost('/uploads'))), readFile);

		const reject1 = error => assert("success", "upload('index.html')(map)(function(x){ x(fork)(reject, result); return id; })", x => logger(x))(inspect(error));
		const result1 = data => assert("'200 OK'", "upload('index.html')(map)(function(x){ x(fork)(reject, result); return id; })", x => logger(x))(inspect(data));
	upload('index.html')(map)(function(x){
		 x(fork)(reject1, result1);
		return id;
	});
	// '200 OK'

	// uploadWithError :: String -> Either String (Task Error JSON)
	const uploadWithError = compose(map(chain(httpPost('/uploadsWithError'))), readFile);

		const reject2 = error => assert("'403 file not found'", "uploadWithError('index.html')(map)(function(x){ x(fork)(reject, result); return id; })", x => logger(x))(inspect(error));
		const result2 = data => assert("error", "uploadWithError('index.html')(map)(function(x){ x(fork)(reject, result); return id; })", x => logger(x))(inspect(data));
	uploadWithError('index.html')(map)(function(x){
		 x(fork)(reject2, result2);
		return id;
	});
	// '403 file not found'

/*
	// upload :: String -> (String -> a) -> Void
	const upload = (filename, callback) => {
		if (!filename) {
			throw new Error('You need a filename!');
		} else {
			readFile(filename, (errF, contents) => {
				if (errF) throw errF;
				httpPost('/uploads', contents, (errH, json) => {
					if (errH) throw errH;
					callback(json);
				});
			});
		}
	};
*/

})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Theory

/*
	// associativity
	compose(join, map(join)) === compose(join, join);

	// identity for all (M a)
	compose(join, of) === compose(join, map(of)) === id;

	// Kleisli category
	const mcompose = (f, g) => compose(chain(f), g);

	// left identity
	mcompose(M, f) === f;

	// right identity
	mcompose(f, M) === f;

	// associativity
	mcompose(mcompose(f, g), h) === mcompose(f, mcompose(g, h));
*/

logger("***********************************************************************" + "\n");
