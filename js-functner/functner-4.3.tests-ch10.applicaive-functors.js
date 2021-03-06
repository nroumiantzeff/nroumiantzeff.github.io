"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch10.md

logger("***********************************************************************" + "\n" +
	"10. Applicative Functors **********************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Applying Applicatives

(function(){

	// mock
	function add(value, x){
		if(x === undefined){
			if(value === 2){
				return x => 2 + x;
			}
			return x => value + x;
		}
		return Number(value) + Number(x);
	}

	// We can't do this because the numbers are bottled up.
		assert("NaN", "add(Container(of)(2), Container(of)(3))", x => logger(x))(inspect(
	add(Container(of)(2), Container(of)(3))
		));
	// NaN

	// Let's use our trusty map
	const containerOfAdd2 = map(add, Container(of)(2));
		containerOfAdd2(inspect)(assert("Container(x => 2 + x)", "map(add, Container(of)(2))", x => logger(x)));
	// Container(x => 2 + x)

	Container(of)(2)(chain)(two => Container(of)(3)(map)(add(two)))
		(inspect)(assert("Container(5)", "Container(of)(2)(chain)(two => Container(of)(3)(map)(add(two)))", x => logger(x)));
	// Container(5)
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ships in Bottles

(function(){

	Container(of)(add(2))(ap)(Container(of)(3))
		(inspect)(assert("Container(5)", "Container(of)(add(2))(ap)(Container(of)(3))", x => logger(x)));
	// Container(5)

/*
	F.of(x).map(f) === F.of(f).ap(F.of(x));
*/

	Maybe(of)(add)(ap)(Maybe(of)(2))(ap)(Maybe(of)(3))
		(inspect)(assert("Just(5)", "Maybe(of)(add)(ap)(Maybe(of)(2))(ap)(Maybe(of)(3))", x => logger(x)));
	// Just(5)

	Task(of)(add)(ap)(Task(of)(2))(ap)(Task(of)(3))
		(inspect)(assert("Task(5)", "Task(of)(add)(ap)(Task(of)(2))(ap)(Task(of)(3))", x => logger(x)));
	// Task(5)
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Coordination Motivation

(function(){

	// mock
	const Http = {
		// Http.get :: String -> Task Error HTML
		get: function(url){
			if(url === '/destinations'){
				return Task()((reject, result) => result([ 'Rome', 'Venicia' ]));
			}
			if(url === '/events'){
				return Task()((reject, result) => result([ 'Venicia carnival' ]));
			}
			return Task()((reject, result) => reject('403 File not found'));
		},
	};

	// mock
	const renderPage = curry((destinations, events) => {
		/* render page */
		if(destinations[0] === 'Rome' && destinations[1] === 'Venicia' && events[0] === 'Venicia carnival'){
			return '<div>some page with dest and events</div>';
		}
	});

		const reject = error => assert("success", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))", x => logger(x))(inspect(error));
		const result = data => assert("'<div>some page with dest and events</div>'", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))(fork)(reject, result)", x => logger(x))(inspect(data));
	Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))
	// Task('<div>some page with dest and events</div>')
		(fork)(reject, result);
	// '<div>some page with dest and events</div>'
})();


(function(){

	// mock
	const document = {
		querySelector: function (selector){
			if(selector === '#email'){
				return { value: 'gg@allin.com' };
			}
			if(selector === '#password'){
				return { value: '0000' };
			}
		},
	};

	// $ :: String -> IO DOM
	const $ = selector => IO()(() => document.querySelector(selector));

	// getVal :: String -> IO String
	const getVal = compose(map(prop('value')), $);

	// signIn :: String -> String -> Bool -> User
	const signIn = curry((username, password, rememberMe) => (username === 'gg@allin.com' && password === '0000' && rememberMe === false)? { id: 3, email: username }: {});

	IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))
		(inspect)(assert("IO({'id':3,'email':'gg@allin.com'})", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))", x => logger(x)));
	// IO({'id':3,'email':'gg@allin.com'})

		assert("{'id':3,'email':'gg@allin.com'}", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO()(false))", x => logger(x))(inspect(
	IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))
		(unsafePerformIO)()
		));
	// {'id':3,'email':'gg@allin.com'}
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bro, Do You Even Lift?

/*
const liftA2 = curry((g, f1, f2) => f1.map(g).ap(f2));

const liftA3 = curry((g, f1, f2, f3) => f1.map(g).ap(f2).ap(f3));

// liftA4, etc
*/

(function(){

	// mock
	// checkEmail :: User -> Either String Email
	const checkEmail = user => user['email']? Either(of)(user['email']): left('invalid email');

	// mock
	// checkName :: User -> Either String String
	const checkName = user => user['name']? Either(of)(user['name']): left('invalid name');

	const user = {
		name: 'John Doe',
		email: 'blurp_blurp',
	};

	//  createUser :: Email -> String -> IO User
	const createUser = curry((email, name) => IO()(user));

	Either(of)(createUser)(ap)(checkEmail(user))(ap)(checkName(user))
		(inspect)(assert("Right(IO({'name':'John Doe','email':'blurp_blurp'}))", "Either(of)(createUser)(ap)(checkEmail(user))(ap)(checkName(user))", x => logger(x)));
	// Right(IO({'name':'John Doe','email':'blurp_blurp'}))

	liftA2(createUser, checkEmail(user), checkName(user))
		(inspect)(assert("Right(IO({'name':'John Doe','email':'blurp_blurp'}))", "liftA2(createUser, checkEmail(user), checkName(user))", x => logger(x)));
	// Right(IO({'name':'John Doe','email':'blurp_blurp'}))

})();

(function(){

	liftA2(add, Maybe(of)(2), Maybe(of)(3))
		(inspect)(assert("Just(5)", "liftA2(add, Maybe(of)(2), Maybe(of)(3))", x => logger(x)));
	// Just(5)
})();

(function(){

	// mock
	const Http = {
		// Http.get :: String -> Task Error HTML
		get: function(url){
			if(url === '/destinations'){
				return Task()((reject, result) => result([ 'Rome', 'Venicia' ]));
			}
			if(url === '/events'){
				return Task()((reject, result) => result([ 'Venicia carnival' ]));
			}
			return Task()((reject, result) => reject('403 File not found'));
		},
	};

	// mock
	const renderPage = curry((destinations, events) => {
		/* render page */
		if(destinations[0] === 'Rome' && destinations[1] === 'Venicia' && events[0] === 'Venicia carnival'){
			return '<div>some page with dest and events</div>';
		}
	});

		const reject1 = error => assert("success", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))", x => logger(x))(inspect(error));
		const result1 = data => assert("'<div>some page with dest and events</div>'", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))(fork)(reject, result)", x => logger(x))(inspect(data));
	Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))
	// Task('<div>some page with dest and events</div>')
		(fork)(reject1, result1);
	// '<div>some page with dest and events</div>'

		const reject2 = error => assert("success", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))", x => logger(x))(inspect(error));
		const result2 = data => assert("'<div>some page with dest and events</div>'", "Task(of)(renderPage)(ap)(Http.get('/destinations'))(ap)(Http.get('/events'))(fork)(reject, result)", x => logger(x))(inspect(data));
	liftA2(renderPage, Http.get('/destinations'), Http.get('/events'))
	// Task('<div>some page with dest and events</div>')
		(fork)(reject2, result2);
	// '<div>some page with dest and events</div>'
})();

(function(){

	// mock
	const document = {
		querySelector: function (selector){
			if(selector === '#email'){
				return { value: 'gg@allin.com' };
			}
			if(selector === '#password'){
				return { value: '0000' };
			}
		},
	};

	// $ :: String -> IO DOM
	const $ = selector => IO()(() => document.querySelector(selector));

	// getVal :: String -> IO String
	const getVal = compose(map(prop('value')), $);

	// signIn :: String -> String -> Bool -> User
	const signIn = curry((username, password, rememberMe) => (username === 'gg@allin.com' && password === '0000' && rememberMe === false)? { id: 3, email: username }: {});

	IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))
		(inspect)(assert("IO({'id':3,'email':'gg@allin.com'})", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))", x => logger(x)));
	// IO({'id':3,'email':'gg@allin.com'})

		assert("{'id':3,'email':'gg@allin.com'}", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO()(false))", x => logger(x))(inspect(
	IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))
		(unsafePerformIO)()
		));
	// {'id':3,'email':'gg@allin.com'}
	
	liftA3(signIn, getVal('#email'), getVal('#password'), IO(of)(false))
		(inspect)(assert("IO({'id':3,'email':'gg@allin.com'})", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO(of)(false))", x => logger(x)));
	// IO({'id':3,'email':'gg@allin.com'})

		assert("{'id':3,'email':'gg@allin.com'}", "IO(of)(signIn)(ap)(getVal('#email'))(ap)(getVal('#password'))(ap)(IO()(false))", x => logger(x))(inspect(
	liftA3(signIn, getVal('#email'), getVal('#password'), IO(of)(false))
		(unsafePerformIO)()
		));
	// {'id':3,'email':'gg@allin.com'}
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Operators

(function(){

/*
	-- Haskell / PureScript
	add <$> Right 2 <*> Right 3
*/

	// JavaScript
	map(add, Right(2))(ap)(Right(3));

	map(add, Right(2))(ap)(Right(3))
		(inspect)(assert("Right(5)", "map(add, Right(2))(ap)(Right(3))", x => logger(x)));
	// Right(5)
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Free Can Openers

/*
	// map derived from of/ap
	X.prototype.map = function map(f) {
		return this.constructor.of(f).ap(this);
	};
*/

/*
	// map derived from chain
	X.prototype.map = function map(f) {
		return this.chain(a => this.constructor.of(f(a)));
	};
*/
	//todo derive (map) from (chain) for Monad

/*
	// ap derived from chain/map
	X.prototype.ap = function ap(other) {
		return this.chain(f => other.map(f));
	};
*/
	//todo derive (map) from (chain) for Monad


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Laws

(function(){

	// identity
	// A.of(id).ap(v) === v;

	const v = Identity(of)('Pillow Pets');
		v(inspect)(assert("Identity('Pillow Pets')", "Identity(of)('Pillow Pets')", x => logger(x)));
	// Identity('Pillow Pets')

	// Identity.of(id).ap(v) === v;

	Identity(of)(id)(ap)(v)
		(inspect)(assert("Identity('Pillow Pets')", "Identity(of)(id)(ap)(v)", x => logger(x)));
	// Identity('Pillow Pets')
})();

(function (){

	// homomorphism
	// A.of(f).ap(A.of(x)) === A.of(f(x));

	// Either(of)(toUpperCase)(ap)(Either(of)('oreos')) === Either(of)(toUpperCase('oreos'));

	Either(of)(toUpperCase)(ap)(Either(of)('oreos'))
			(inspect)(assert("Right('OREOS')", "Either(of)(toUpperCase)(ap)(Either(of)('oreos'))", x => logger(x)));
	// Right('OREOS')

	Either(of)(toUpperCase('oreos'))
			(inspect)(assert("Right('OREOS')", "Either(of)(toUpperCase('oreos'))", x => logger(x)));
	// Right('OREOS')
})();

(function (){

	// interchange
	// v.ap(A.of(x)) === A.of(f => f(x)).ap(v);

	const v = Task(of)(reverse);
	const x = 'Sparklehorse';

	// v(ap)(Task(of)(x)) === Task(of)(f => f(x))(ap)(v);

	v(ap)(Task(of)(x))
		(inspect)(assert("Task('esrohelkrapS')", "v(ap)(Task(of)(x))", x => logger(x)));
	// Task('esrohelkrapS')

	Task(of)(f => f(x))(ap)(v)
		(inspect)(assert("Task('esrohelkrapS')", "Task(of)(f => f(x))(ap)(v)", x => logger(x)));
	// Task('esrohelkrapS')
})();

(function(){

	// composition
	// A.of(compose).ap(u).ap(v).ap(w) === u.ap(v.ap(w));

	const u = IO()(toUpperCase);
	const v = IO()(concat('& beyond'));
	const w = IO()('blood bath ');

	// IO(of)(compose)(ap)(u)(ap)(v)(ap)(w) === u(ap)(v(ap)(w));

	IO(of)(compose)(ap)(u)(ap)(v)(ap)(w)
		(inspect)(assert("IO('BLOOD BATH & BEYOND')", "IO(of)(compose)(ap)(u)(ap)(v)(ap)(w)", x => logger(x)));
	// IO('BLOOD BATH & BEYOND')

	u(ap)(v(ap)(w))
		(inspect)(assert("IO('BLOOD BATH & BEYOND')", "u(ap)(v(ap)(w))", x => logger(x)));
	// IO('BLOOD BATH & BEYOND')
})();

logger("***********************************************************************" + "\n");
