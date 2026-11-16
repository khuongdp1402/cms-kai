#!/bin/bash
# Dựng lại video: bash build.sh   (cần Google Chrome và ffmpeg)
# Render 720 khung (30fps x 24s) từ scene.html, ghép nhạc nền tự tạo, xuất kalo-brand-24s.mp4.
set -e
cd "$(dirname "$0")"
TMP=$(mktemp -d)
export FRAMES=$TMP/frames SCENE=$PWD/scene.html
mkdir -p "$FRAMES"
cat > "$TMP/one.sh" <<'EOS'
#!/bin/bash
i=$1; T=$(python3 -c "print(f'{$i/30:.4f}')"); N=$(printf "%04d" $i)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --virtual-time-budget=2000 --allow-file-access-from-files --window-size=1280,720 \
  --screenshot="$FRAMES/f$N.png" "file://$SCENE?t=$T" >/dev/null 2>&1
EOS
chmod +x "$TMP/one.sh"
seq 0 719 | xargs -P 8 -I{} "$TMP/one.sh" {}
# nhạc nền: 4 hợp âm C - Am - F - G, mỗi đoạn 6,6 giây nối chồng 0,6 giây
seg(){ n=$1; shift; a=(); k=0
  for f in "$@"; do a+=(-f lavfi -i "sine=frequency=$f:duration=6.6:sample_rate=44100"); k=$((k+1)); done
  ffmpeg -y -loglevel error "${a[@]}" -filter_complex "amix=inputs=$k:normalize=0,volume=0.11,tremolo=f=0.35:d=0.25,afade=t=in:st=0:d=1.2,afade=t=out:st=5.4:d=1.2,lowpass=f=1800" "$TMP/s$n.wav"; }
seg 1 130.81 261.63 329.63 392.00; seg 2 110.00 220.00 261.63 329.63
seg 3 87.31 174.61 220.00 261.63;  seg 4 98.00 196.00 246.94 392.00
ffmpeg -y -loglevel error -i "$TMP/s1.wav" -i "$TMP/s2.wav" -i "$TMP/s3.wav" -i "$TMP/s4.wav" \
  -filter_complex "[0][1]acrossfade=d=0.6[a];[a][2]acrossfade=d=0.6[b];[b][3]acrossfade=d=0.6,atrim=0:24,afade=t=out:st=22.6:d=1.4" -ar 44100 -ac 2 "$TMP/music.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$FRAMES/f%04d.png" -i "$TMP/music.wav" -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart kalo-brand-24s.mp4
ffmpeg -y -loglevel error -i "$FRAMES/f0270.png" -q:v 3 kalo-brand-poster.jpg
rm -rf "$TMP"; echo "Xong: $(pwd)/kalo-brand-24s.mp4"
