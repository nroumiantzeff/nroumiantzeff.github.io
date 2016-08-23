function Harmonic(audioContext, master, container, tone, octave, type, order){
	this.audioContext = audioContext;
	this.master = master;
	this.container = container;
	this.tone = tone;
	this.octave;
	this.type = type;
	this.order = order;
	this.oscillator = new Oscillator(audioContext, master);
	this.setFrequency(tone, octave, type, order);
	this.setDetune(tone, octave, type, order);
	this.setLabel(type, order);
	this.on = false;
	if (order == 1 || order == 3 || order == 5){
		this.on = true;
	}
	this.div = document.createElement("DIV");
	this.div.className = "harmonic";
	this.div.appendChild(document.createTextNode(this.label));
	container.appendChild(this.div);
	if (this.on){
		this.div.className = "harmonic harmonic-on";
		this.oscillator.setGain(1);
	}
	var harmonic = this;
	this.div.onmousedown = function(){
		if (harmonic.on){
			harmonic.oscillator.setGain(0);
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.oscillator.setGain(1);
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	};
	this.div.addEventListener('touchstart', function (event){
		event.preventDefault();
		if (harmonic.on){
			harmonic.oscillator.setGain(0);
			harmonic.on = false;
			harmonic.div.className = "harmonic";
		}
		else{
			harmonic.oscillator.setGain(1);
			harmonic.on = true;
			harmonic.div.className = "harmonic harmonic-on";
		}
	}, false);
}

Harmonic.prototype.setFrequency = function(tone, octave, type, order){
	this.frequency = 440;
	this.oscillator.setFrequency(this.frequency);
}

Harmonic.prototype.setDetune = function(tone, octave, type, order){
	var detune = 0;
	var TONES = { "C": -900, "C#": -800, "D": -700, "D#": -600, "E": -500, "F": -400, "F#": -300, "G": -200, "G#": -100, "A": 0, "A#": 100, "B": 200};
	detune += TONES[tone];
	var pitch = (order - 1) % 7;
	octave += (order - 1 - pitch) / 7;
	if (type === "minor"){
		var MINOR = [0, 200, 300, 500, 700, 800, 1000];
		detune += MINOR[pitch];
	}
	else{
		var MAJOR = [0, 200, 400, 500, 700, 900, 1100];
		detune += MAJOR[pitch];
	}
	detune += octave * 1200;
	this.detune = detune;
	this.oscillator.setDetune(this.detune);
}

Harmonic.prototype.setLabel = function(type, order){
	var label = (order === 1)? "1st": (order === 2)? "2nd": (order === 3)? "3rd": order + "th";
	this.label = label;
}

function Chord(audioContext, master, container, before, tone, octave, type){
	this.audioContext = audioContext;
	this.master = master;
	this.gain = new Gain(audioContext, master);
	this.mute = 0;
	this.container = container;
	this.tone = tone;
	this.octave = octave;
	this.type = type;
	this.setLabel(tone, octave, type);
	this.on = false;
	this.whole = document.createElement("DIV");
	this.whole.className = "chord";
	if (before){
		container.insertBefore(this.whole, before);
	}
	else{
		container.appendChild(this.whole);
	}
	this.harmonics = [];
	for (var order = 17; order > 0; order--){
		var harmonic = new Harmonic(audioContext, this.gain, this.whole, tone, octave, type, order);
		this.harmonics.push(harmonic);
	}
	this.addSeparator();
	this.div = document.createElement("DIV");
	this.div.className = "chord-button";
	this.div.appendChild(document.createTextNode(this.label));
	this.whole.appendChild(this.div);
	var chord = this;
	this.div.onmousedown = function(){
		chord.gain.setGain(1-chord.mute);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	};
	this.div.onmouseup = function(){
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	};
	this.div.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.gain.setGain(1-chord.mute);
		chord.on = true;
		chord.div.className = "chord-button chord-on";
	}, false);
	this.div.addEventListener('touchend', function(event){
		event.preventDefault();
		chord.gain.setGain(0);
		chord.on = false;
		chord.div.className = "chord-button";
	}, false);
	this.addSeparator();
	this.addSeparator();
	this.addSelector("tone", "changeTone", {"B":"B","A#":"A#","A":"A","G#":"G#","G":"G","F#":"F#","F":"F","E":"E","D#":"D#","D":"D","C#":"C#","C":"C"});
	this.addSeparator();
	this.addSelector("octave", "changeOctave", {"+5":5,"+4":4,"+3":3,"+2":2,"+1":1,"+0":0,"-1":-1,"-2":-2,"-3":-3,"-4":-4,"-5":-5});
	this.addSeparator();
	this.addSelector("type", "changeType", {"":"major", "m":"minor"});
	this.addSeparator();
	this.addSelector("mute", "changeMute", {"*1":0,"*0.9":0.1,"*0.8":0.2,"*0.7":0.3,"*0.6":0.4,"*0.5":0.5,"*0.4":0.6,"*0.3":0.7,"*0.2":0.8,"*0.1":0.9,"*0":1});
	this.addSeparator();
	var appendButton = document.createElement("DIV");
	appendButton.className = "chord-append";
	appendButton.appendChild(document.createTextNode("+"));
	this.whole.appendChild(appendButton);
	appendButton.onmousedown = function(){
		chord.newChord();
	};
	appendButton.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.newChord();
	}, false);
	var deleteButton = document.createElement("DIV");
	deleteButton.className = "chord-delete";
	deleteButton.appendChild(document.createTextNode("-"));
	this.whole.appendChild(deleteButton);
	deleteButton.onmousedown = function(){
		chord.deleteChord();
	};
	deleteButton.addEventListener('touchstart', function(event){
		event.preventDefault();
		chord.deleteChord();
	}, false);
}

Chord.prototype.addSeparator = function(){
	var separator = document.createElement("DIV");
	separator.className = "chord-separator";
	this.whole.appendChild(separator);
}

Chord.prototype.setLabel = function(tone, octave, type){
	var label = tone;
	if (type === "minor"){
		label += "m";
	}
	this.label = label;
}

Chord.prototype.insertChord = function(tone, octave, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole, tone, octave, type);
}

Chord.prototype.appendChord = function(tone, octave, type){
	return new Chord(this.audioContext, this.master, this.container, this.whole.nextSibling, tone, octave, type);
}

Chord.prototype.newChord = function(){
	this.appendChord(this.tone, this.octave, this.type);
}

Chord.prototype.changeChord = function(tone, octave, type){
	this.tone = tone;
	this.type = type;
	this.refresh();
}

Chord.prototype.refresh = function(){
	this.setLabel(this.tone, this.octave, this.type);
	this.div.firstChild.nodeValue = this.label;
	for (var index = 0; index < this.harmonics.length; index++){
		var harmonic = this.harmonics[index];
		var order = this.harmonics.length - index; 
		harmonic.setFrequency(this.tone, this.octave, this.type, order);
		harmonic.setDetune(this.tone, this.octave, this.type, order);
	}
}

Chord.prototype.changeTone = function(tone){
	this.tone = tone;
	this.refresh();
}

Chord.prototype.changeOctave = function(octave){
	this.octave = parseInt(octave, 10);
	this.refresh();
}

Chord.prototype.changeType = function(type){
	this.type = type;
	this.refresh();
}

Chord.prototype.changeMute = function(mute){
	this.mute = mute;
}

Chord.prototype.deleteChord = function(){
	//todo release oscilator resources
}

Chord.prototype.addSelector = function(name, handler, options){
	var div = document.createElement("DIV");
	var selector = document.createElement("SELECT");
	selector.className = "chord-selector";
	for (var key in options){
		var option = document.createElement("OPTION");
		option.value = options[key];
		if (option.value == this[name]){
			option.selected = true;
		}
		option.appendChild(document.createTextNode(key));
		selector.appendChild(option);
	}
	div.appendChild(selector);
	this.whole.appendChild(div);
	var chord = this;
	selector.onchange = function(){
		chord[handler](selector.value);
	};
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var master = new Gain(audioContext);
master.setGain(0.1);

new Chord(audioContext, master, document.body, null, "C", 0, "minor");
new Chord(audioContext, master, document.body, null, "D", 0, "minor");
new Chord(audioContext, master, document.body, null, "E", 0, "minor");
new Chord(audioContext, master, document.body, null, "F", 0, "minor");
new Chord(audioContext, master, document.body, null, "G", 0, "minor");
new Chord(audioContext, master, document.body, null, "A", 0, "minor");
new Chord(audioContext, master, document.body, null, "A", 0, "minor");
new Chord(audioContext, master, document.body, null, "A", 0, "minor");
new Chord(audioContext, master, document.body, null, "B", 0, "minor");
