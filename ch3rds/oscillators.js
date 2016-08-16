function Gain(audioContext, master){
	this.audioContext = audioContext;
	this.destination = master? master.gain: audioContext.destination;
	this.gain = audioContext.createGain();
	this.gain.gain.value = 0;
	this.gain.connect(this.destination);
}

Gain.prototype.control = function(node){
	node.connect(this.gain);
};

Gain.prototype.setGain = function(value){
	this.gain.gain.value = value;
};

function Oscillator(audioContext, master){
	this.audioContext = audioContext;
	this.master = master;
	this.oscillator = audioContext.createOscillator();
	this.oscillator.type = "sine";
	this.oscillator.start(0);
	this.gain = new Gain(audioContext, master);
	this.gain.control(this.oscillator);
}

Oscillator.prototype.setType = function(value){
	this.oscillator.type = value;
};

Oscillator.prototype.setDetune = function(value){
	this.oscillator.detune.value = value;
};

Oscillator.prototype.setFrequency = function(value){
	this.oscillator.frequency.value = value;
};

Oscillator.prototype.setGain = function(value){
	this.gain.setGain(value);
};

