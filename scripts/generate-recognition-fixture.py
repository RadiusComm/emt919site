"""Generate synthetic QA speech from literal text only; never reads a microphone/audio input."""
import hashlib,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
text='This is the five foot test. The plane flies west. I can hear every word clearly.'
path=root/'qa/generated-five.wav'
command=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'flite=text={text}:voice=slt','-ar','16000','-ac','1','-c:a','pcm_s16le',str(path)]
subprocess.run(command,check=True)
manifest={'file':'qa/generated-five.wav','source':'FFmpeg lavfi libflite speech synthesis, voice slt; literal text only, no microphone or audio input','text':text,'sampleRate':16000,'channels':1,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(root/'qa/generated-five.provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
