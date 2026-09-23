export class RuneAudio {
  constructor(){this.enabled=true;this.ctx=null;this.nextBeat=0;this.beat=0;this.mode='home';this.lastHit=0;}
  init(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return;}try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.24:0;this.master.connect(this.ctx.destination);this.wet=this.ctx.createGain();this.wet.gain.value=.16;this.reverb=this.ctx.createConvolver();const n=this.ctx.sampleRate*1.5,buf=this.ctx.createBuffer(2,n,this.ctx.sampleRate);for(let ch=0;ch<2;ch++){const b=buf.getChannelData(ch);for(let i=0;i<n;i++)b[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.7);}this.reverb.buffer=buf;this.reverb.connect(this.wet);this.wet.connect(this.master);this.nextBeat=this.ctx.currentTime+.1;}catch{this.ctx=null;}}
  setEnabled(value){this.enabled=value;if(this.ctx)this.master.gain.setTargetAtTime(value?.24:0,this.ctx.currentTime,.1);}
  tone(freq,time,duration=.3,volume=.2,type='sine',endFreq=0){if(!this.ctx||!this.enabled)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(10,endFreq),time+duration);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(this.master);if(type==='sine'||type==='triangle')g.connect(this.reverb);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
  noise(duration=.12,volume=.14,freq=1200){if(!this.ctx||!this.enabled)return;const now=this.ctx.currentTime,n=Math.ceil(this.ctx.sampleRate*duration),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();source.buffer=b;filter.type='lowpass';filter.frequency.value=freq;g.gain.value=volume;source.connect(filter);filter.connect(g);g.connect(this.master);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};}
  effect(name){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime;
    if(name==='attack'){if(t-this.lastHit<.18)return;this.lastHit=t;this.noise(.09,.17,2500);this.tone(380,t,.08,.06,'triangle',160);}
    if(name==='swing')this.noise(.13,.085,1400);
    if(name==='dodge')this.noise(.22,.12,1000);
    if(name==='block'){this.noise(.07,.12,4200);this.tone(720,t,.17,.12,'triangle',480);}
    if(name==='hurt'){this.noise(.1,.15,350);this.tone(90,t,.12,.18,'sine',45);}
    if(name==='burst'){this.noise(.55,.35,2500);[146.83,220,293.66,440].forEach((f,i)=>this.tone(f,t+i*.04,.75,.2,'triangle',f*.5));}
    if(name==='guard'||name==='perfect'){[293.66,440,587.33].forEach((f,i)=>this.tone(f,t+i*.06,.7,.18,'sine'));}
    if(name==='warning'){this.tone(110,t,.4,.28,'triangle');this.tone(103.83,t+.12,.6,.2,'triangle');}
    if(name==='slam'){this.noise(.55,.5,500);this.tone(80,t,.6,.4,'sine',24);}
    if(name==='choose'||name==='stage'){[220,293.66,440].forEach((f,i)=>this.tone(f,t+i*.1,.65,.17,'sine'));}
    if(name==='win'){[146.83,220,293.66,349.23,440,587.33].forEach((f,i)=>this.tone(f,t+i*.15,1.5,.2,'triangle'));}
    if(name==='lose'){[146.83,130.81,110,73.42].forEach((f,i)=>this.tone(f,t+i*.2,1,.2,'sine'));}
  }
  tick(mode,stage=0){if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(mode!=='battle'){this.nextBeat=now+.2;return;}if(this.nextBeat<now-.5)this.nextBeat=now+.05;const beats=[146.83,220,293.66,220,130.81,196,261.63,196,116.54,174.61,233.08,174.61,130.81,196,220,196];while(this.nextBeat<now+.15){const b=this.beat%16,t=this.nextBeat;this.tone(beats[b],t,.65,.08,'triangle');if(b%4===0){this.tone(beats[b]/2,t,1.4,.18,'sine');this.tone(65,t,.25,.2,'sine',28);}if(stage>0&&b%2===1)this.tone(beats[b]*2,t,.25,.035,'sine');if(stage===2&&b%2===0)this.tone(82,t,.15,.1,'triangle',40);this.nextBeat+=stage===2?.32:.41;this.beat++;}}
}
