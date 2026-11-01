#!/usr/bin/env python3
"""CARVE audition scores + sample-free offline synthesizer (not in-game music).
Render: python -m venv /tmp/carve-music-venv; pip install -r scripts/music-requirements.txt
       /tmp/carve-music-venv/bin/python scripts/render-music-demos.py
Requires ffmpeg on PATH. No network, samples, soundfonts, reference audio or music API.
Source code is MIT; composition data/recordings have their own assets/music/demos/RIGHTS.md.
"""
from pathlib import Path
import hashlib, json, math, re, struct, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/music/demos'
WORK = ROOT / 'build/music-demos'
RATE = 44100
PITCHES = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
VOICES = ['pad','mallet','wood','pluck','lead','bass','kick','snare','shaker','tom']

def pitch(note):
    m = re.fullmatch(r'([A-G]#?)(-?\d)', note)
    return 12 * (int(m[2]) + 1) + PITCHES[m[1]]

def make_score(slug, title, bpm, bars, key, seed, description):
    return dict(version=1, slug=slug, title=title, bpm=bpm, bars=bars, key=key, seed=seed,
        description=description, authorship='AI-assisted composition for CARVE; no claim of human authorship',
        sources='Explicit note arrangement; mathematical synthesis only. No recordings/samples/reference tracks.', notes=[])

def add(s, beat, duration, note, voice, velocity=.5, pan=0):
    s['notes'].append(dict(beat=round(beat,5),duration=duration,pitch=pitch(note) if isinstance(note,str) else note,
        voice=voice,velocity=velocity,pan=pan))

def phrase(s, bar, events, voice, pan=0, velocity=.55):
    for at,note,length in events: add(s,bar*4+at,length,note,voice,velocity,pan)

def skyward():
    s=make_score('skyward','Skyward',96,16,'D major',2026110101,
        'Warm electronic adventure: floating pads, soft mallets and an unhurried upward pulse.')
    chords=[['D3','A3','F#4','E5'],['C#3','A3','E4','B4'],['B2','F#3','A3','D4'],['G2','D3','F#4','A4']]
    for bar in range(0,16,2):
        c=chords[(bar//2)%4]
        for i,n in enumerate(c):add(s,bar*4,8,n,'pad',.25,(-.65,-.25,.25,.65)[i])
    for b in range(16):
        c=chords[(b//2)%4]; root=pitch(c[0])-12
        for t,n,d in [(0,root,1.4),(2.5,root+7,.65),(3.5,root+12,.35)]:add(s,b*4+t,d,n,'bass',.43)
        for i,t in enumerate([.5,1.75,2.5,3.25]):
            if b in [0,1,14,15] and i%2:continue
            add(s,b*4+t,.42,pitch(c[1+i%3])+12,'pluck',.23,(-1 if i%2 else 1)*.45)
        if 4<=b<14:
            add(s,b*4,.22,36,'kick',.32);add(s,b*4+2,.22,36,'kick',.26)
            for i in range(8):add(s,b*4+i/2,.08,42,'shaker',.16 if i%2 else .10,.25)
    motifs=[
        [(0,'F#5',.65),(.75,'A5',.45),(1.5,'E6',.75),(2.75,'D6',.8)],
        [(.5,'B5',.5),(1.25,'A5',.85),(2.5,'F#5',1.05)],
        [(0,'F#5',.6),(1,'D6',.5),(1.75,'C#6',.55),(2.75,'A5',.9)],
        [(.5,'E5',.7),(1.5,'F#5',.5),(2.5,'A5',1.1)],
        [(0,'B5',.6),(.75,'F#5',.6),(1.75,'A5',.55),(2.75,'D6',1)],
        [(.5,'C#6',.6),(1.5,'B5',.7),(2.5,'F#5',1.1)],
        [(0,'A5',.65),(1,'F#5',.65),(2,'E5',.6),(3,'F#5',.65)],
        [(0,'E5',1),(1.5,'D5',2)],
    ]
    for b in range(2,16):phrase(s,b,motifs[(b-2)%8],'mallet',.12,.58 if b<10 else .53)
    add(s,15*4,3.5,'D5','pad',.18,.25)
    return s

def ancient():
    s=make_score('ancient-gardens','Ancient Gardens',88,12,'A Dorian',2026110102,
        'Organic mystery: wooden tones, breathy atmosphere, resonant bells and a gentle hand-drum pattern.')
    chords=[['A2','E3','G3','B3'],['D3','A3','B3','F#4'],['E3','G3','B3','D4'],['G2','D3','E4','A4']]
    for b in range(12):
        c=chords[(b//2)%4]
        if b%2==0:
            for i,n in enumerate(c):add(s,b*4,8,n,'pad',.20,(i-1.5)*.4)
        add(s,b*4,2.5,pitch(c[0])-12,'bass',.27,-.1)
        for t,v in [(0,.35),(1.5,.22),(2.75,.29)]:add(s,b*4+t,.27,45+(b%2)*5,'tom',v,-.2)
        if b>=2:
            for i,t in enumerate([.5,1.5,2.25,3,3.5]):add(s,b*4+t,.11,42,'shaker',.11+(i%2)*.04,.35)
        for i,t in enumerate([.75,2.25,3.5]):add(s,b*4+t,.5,pitch(c[1+i%3])+12,'wood',.25,(-.55,.4,-.3)[i])
    melodies=[
        [(0,'E5',.9),(1.5,'B4',.75),(2.75,'D5',1)],
        [(.25,'F#5',.8),(1.5,'E5',.65),(2.5,'C5',1.2)],
        [(0,'B4',.7),(1.25,'D5',.65),(2.25,'A5',1.25)],
        [(.75,'G5',.7),(1.75,'E5',.7),(3,'D5',.7)],
        [(0,'C5',.9),(1.5,'E5',.8),(2.75,'F#5',.9)],
        [(.5,'B5',.6),(1.5,'A5',.8),(2.75,'E5',.9)],
        [(0,'D5',.6),(1,'C5',.9),(2.5,'B4',1)],
        [(.5,'E5',.9),(2,'A4',1.75)],
    ]
    for b in range(2,12):phrase(s,b,melodies[(b-2)%8],'wood',.1,.60)
    for b,n in [(0,'A5'),(4,'B5'),(8,'E6')]:add(s,b*4+.25,2,n,'mallet',.22,-.5)
    return s

def neon():
    s=make_score('neon-momentum','Neon Momentum',118,20,'F# minor',2026110103,
        'Bright arcade momentum: a melodic synth hook, syncopated bass and a crisp but restrained electronic beat.')
    chords=[['F#3','A3','C#4','G#4'],['D3','A3','C#4','E4'],['C#3','A3','E4','B4'],['E3','B3','F#4','G#4']]
    for b in range(20):
        c=chords[(b//2)%4]
        if b%2==0:
            for i,n in enumerate(c):add(s,b*4,8,n,'pad',.16,(i-1.5)*.4)
        root=pitch(c[0])-12
        for i,t in enumerate([0,.75,1.5,2,2.75,3.5]):add(s,b*4+t,.37,root+(12 if i==4 else 7 if i==2 else 0),'bass',.48)
        for i in range(8):
            if b<2 and i%2:continue
            add(s,b*4+i*.5,.25,pitch(c[1+(i%3)])+12,'pluck',.21,(-1 if i%2 else 1)*.48)
        if 2<=b<18:
            for t in [0,2]:add(s,b*4+t,.24,36,'kick',.56)
            for t in [1,3]:add(s,b*4+t,.16,38,'snare',.30)
            for i in range(8):add(s,b*4+i*.5,.07,42,'shaker',.18 if i%2 else .12,.25)
        if b in [7,15]:
            for t in [3.25,3.75]:add(s,b*4+t,.10,38,'snare',.17)
    hooks=[
        [(0,'C#5',.5),(.75,'E5',.45),(1.5,'G#5',.65),(2.5,'F#5',.8),(3.5,'C#5',.35)],
        [(.5,'B4',.5),(1.25,'C#5',.75),(2.5,'A4',1)],
        [(0,'F#5',.55),(1,'E5',.55),(1.75,'C#5',.55),(2.75,'B4',.9)],
        [(.5,'A4',.55),(1.5,'B4',.55),(2.5,'C#5',1)],
        [(0,'G#5',.55),(.75,'F#5',.55),(1.75,'E5',.65),(2.75,'C#5',.85)],
        [(.25,'B4',.55),(1.25,'E5',.65),(2.5,'G#5',1)],
        [(0,'F#5',.65),(1,'A5',.55),(2,'G#5',.6),(3,'E5',.6)],
        [(.5,'C#5',.75),(2,'F#5',1.6)],
    ]
    for b in range(2,20):phrase(s,b,hooks[(b-2)%8],'lead',.05,.39 if b<10 else .43)
    return s

def oscillator(n, seconds, voice, rng):
    t=np.arange(max(1,round(seconds*RATE)),dtype=np.float64)/RATE
    f=440*2**((n-69)/12);phase=2*np.pi*f*t
    if voice=='pad':
        # Rounded harmonic bed with slow, small detuning; no sampled instrument.
        signal=(np.sin(phase)+.28*np.sin(phase*1.002+.7)+.12*np.sin(phase*2))*.52
        attack=np.minimum(t/.8,1); release=np.clip((seconds-t)/1.25,0,1)
        env=attack*release*(.88+.08*np.sin(2*np.pi*.18*t))
    elif voice in ('mallet','wood','pluck'):
        if voice=='mallet':signal=np.sin(phase+.35*np.sin(phase*2)*np.exp(-t*8))+.18*np.sin(phase*3.99)*np.exp(-t*6)
        elif voice=='wood':signal=np.sin(phase)+.28*np.sin(phase*2.76)*np.exp(-t*11)+.12*np.sin(phase*5.42)*np.exp(-t*18)
        else:signal=np.sin(phase)+.25*np.sin(phase*2)+.09*np.sin(phase*3)
        decay=2.8 if voice=='mallet' else 4.4 if voice=='wood' else 7
        env=(1-np.exp(-t*450))*np.exp(-t*decay)*np.clip((seconds-t)/.09,0,1)
    elif voice=='bass':
        signal=np.sin(phase)+.26*np.sin(phase*2)+.07*np.sin(phase*3)
        env=np.minimum(t/.009,1)*np.clip((seconds-t)/.08,0,1)*np.exp(-t*.75)
    elif voice=='lead':
        signal=(np.sin(phase+.15*np.sin(2*np.pi*4.2*t))+.22*np.sin(phase*2)+.09*np.sin(phase*3)+.035*np.sin(phase*4))*.76
        env=np.minimum(t/.012,1)*np.clip((seconds-t)/.10,0,1)*(.75+.25*np.exp(-t*9))
    elif voice=='kick':
        signal=np.sin(2*np.pi*(45*t+60*(1-np.exp(-t*28))/28))+.13*rng.standard_normal(len(t))*np.exp(-t*140)
        env=np.minimum(t/.002,1)*np.exp(-t*23)*np.clip((seconds-t)/.02,0,1)
    elif voice=='tom':
        signal=np.sin(phase*(.6+.12*np.exp(-t*18)))+.16*np.sin(phase*1.72)*np.exp(-t*15)
        env=np.minimum(t/.004,1)*np.exp(-t*14)*np.clip((seconds-t)/.03,0,1)
    else:
        noise=rng.standard_normal(len(t))
        smooth=np.convolve(noise,np.ones(9)/9,mode='same'); high=noise-smooth
        if voice=='snare':signal=.38*high+.35*np.sin(2*np.pi*175*t)*np.exp(-t*25);rate=28
        else:signal=.23*high;rate=55
        env=np.minimum(t/.002,1)*np.exp(-t*rate)*np.clip((seconds-t)/.01,0,1)
    return (signal*env).astype(np.float32)

def pcm(path, audio):
    values=np.rint(np.clip(audio,-.999999, .999999)*2147483647).astype('<i4')
    with wave.open(str(path),'wb')as w:
        w.setnchannels(2);w.setsampwidth(4);w.setframerate(RATE);w.writeframes(values.tobytes())

def vlq(value):
    b=[value&127];value>>=7
    while value:b.insert(0,(value&127)|128);value>>=7
    return bytes(b)

def midi(score,path):
    tracks=[];tempo=round(60000000/score['bpm'])
    meta=b'\x00\xff\x51\x03'+tempo.to_bytes(3,'big')+b'\x00\xff\x58\x04\x04\x02\x18\x08\x00\xff\x2f\x00'
    tracks.append(meta)
    for channel,voice in enumerate(VOICES):
        notes=[n for n in score['notes']if n['voice']==voice]
        if not notes:continue
        ch=9 if voice in ['kick','snare','shaker','tom']else channel
        events=[]
        for n in notes:
            tick=round(n['beat']*480);end=round((n['beat']+n['duration'])*480)
            events.extend([(tick,bytes([0x90+ch,n['pitch'],max(1,round(n['velocity']*127))])),(end,bytes([0x80+ch,n['pitch'],0]))])
        name=voice.encode();data=b'\x00\xff\x03'+vlq(len(name))+name;last=0
        for tick,event in sorted(events,key=lambda e:(e[0],e[1][0])):
            data+=vlq(tick-last)+event;last=tick
        data+=b'\x00\xff\x2f\x00';tracks.append(data)
    content=b'MThd'+struct.pack('>IHHH',6,1,len(tracks),480)
    for t in tracks:content+=b'MTrk'+struct.pack('>I',len(t))+t
    path.write_bytes(content)

def ffmpeg(*args):
    return subprocess.run(['ffmpeg','-hide_banner','-nostdin','-y',*map(str,args)],check=True,capture_output=True,text=True)

def render(score):
    seconds=score['bars']*4*60/score['bpm']+3
    frames=round(seconds*RATE);mix=np.zeros((frames,2),dtype=np.float32);send=np.zeros_like(mix)
    rng=np.random.default_rng(score['seed']);spb=60/score['bpm']
    for n in score['notes']:
        duration=n['duration']*spb+(1.2 if n['voice']=='pad'else .08)
        sound=oscillator(n['pitch'],duration,n['voice'],rng)*n['velocity']*.25
        start=round(n['beat']*spb*RATE);count=min(len(sound),frames-start)
        if count<=0:continue
        angle=(n['pan']+1)*np.pi/4
        stereo=sound[:count,None]*np.array([math.cos(angle),math.sin(angle)],dtype=np.float32)
        mix[start:start+count]+=stereo
        if n['voice']in ['pad','mallet','wood','pluck','lead']:send[start:start+count]+=stereo
    # Damped multi-tap stereo ambience; no convolution recording or impulse file.
    for delay,gain in [(.137,.17),(.251,.12),(.389,.095),(.547,.065),(.743,.04)]:
        offset=round(delay*RATE)
        for channel in range(2):
            wet=np.convolve(send[:,1-channel],np.ones(17,dtype=np.float32)/17,mode='same')
            mix[offset:,channel]+=wet[:-offset]*gain
    fade_in=round(.06*RATE);fade_out=round(2.3*RATE)
    mix[:fade_in]*=np.linspace(0,1,fade_in,dtype=np.float32)[:,None]
    mix[-fade_out:]*=np.linspace(1,0,fade_out,dtype=np.float32)[:,None]
    mix-=np.mean(mix,axis=0)
    # A bounded bus trim preserves headroom before the measured mastering pass.
    mix*=.8/max(.8,float(np.max(np.abs(mix))))
    raw=WORK/(score['slug']+'-premaster.wav');pcm(raw,mix)
    analysis=ffmpeg('-i',raw,'-af','loudnorm=I=-18:TP=-1.5:LRA=9:print_format=json','-f','null','-')
    stats=json.JSONDecoder().raw_decode(analysis.stderr[analysis.stderr.rfind('{'):])[0]
    master=WORK/(score['slug']+'-master.wav')
    filt='loudnorm=I=-18:TP=-1.5:LRA=9:linear=true:'+':'.join([
        'measured_I='+stats['input_i'],'measured_TP='+stats['input_tp'],'measured_LRA='+stats['input_lra'],
        'measured_thresh='+stats['input_thresh'],'offset='+stats['target_offset']])
    ffmpeg('-i',raw,'-af',filt,'-ar',RATE,'-c:a','pcm_s24le',master)
    mp3=OUT/(score['slug']+'.mp3')
    ffmpeg('-i',master,'-c:a','libmp3lame','-b:a','160k','-id3v2_version','3',
        '-metadata','title='+score['title'],'-metadata','album=CARVE music audition demos',
        '-metadata','artist=CARVE project - AI-assisted demo','-metadata','comment=Sample-free local synthesis; see RIGHTS.md and provenance.json',mp3)
    measured=ffmpeg('-i',mp3,'-af','loudnorm=I=-18:TP=-1.5:LRA=9:print_format=json','-f','null','-')
    result=json.JSONDecoder().raw_decode(measured.stderr[measured.stderr.rfind('{'):])[0]
    score['notes'].sort(key=lambda n:(n['beat'],n['voice'],n['pitch']))
    scorepath=OUT/'source'/(score['slug']+'.score.json');scorepath.write_text(json.dumps(score,indent=2)+'\n')
    midipath=OUT/'source'/(score['slug']+'.mid');midi(score,midipath)
    return dict(slug=score['slug'],title=score['title'],bpm=score['bpm'],key=score['key'],description=score['description'],
        seconds=round(seconds,3),file=mp3.name,score='source/'+scorepath.name,midi='source/'+midipath.name,
        sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),bytes=mp3.stat().st_size,
        integrated_lufs=float(result['input_i']),true_peak_dbtp=float(result['input_tp']),loudness_range_lu=float(result['input_lra']))

def main():
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'source').mkdir(exist_ok=True);WORK.mkdir(parents=True,exist_ok=True)
    tracks=[]
    for score in [skyward(),ancient(),neon()]:
        row=render(score);tracks.append(row);print(row['title'],row['seconds'],'seconds',row['integrated_lufs'],'LUFS',flush=True)
    manifest=dict(version=1,created='2026-11-01',purpose='Audition only, not wired into gameplay',tracks=tracks)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    provenance=dict(version=1,composition='AI-assisted original note arrangements composed for this request; no human-composer claim',
        rendering='Local oscillators, harmonic sums, synthesized envelopes and seeded noise only',
        external_audio_inputs=[],external_music_services=[],reference_tracks=[],
        tools={'python':'3.14','numpy':np.__version__,'ffmpeg':subprocess.run(['ffmpeg','-version'],capture_output=True,text=True,check=True).stdout.splitlines()[0]},
        renderer='scripts/render-music-demos.py',renderer_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        masters='Local ignored build/music-demos/*-master.wav, 44.1 kHz stereo 24-bit PCM',
        limitations=['No global similarity search or legal clearance performed','AI authorship/copyright protection depends on law and human contribution','Demo excerpts fade out; not final seamless game loops'],
        rights_notice='RIGHTS.md')
    (OUT/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')

if __name__=='__main__':main()
