const canvas = document.getElementById('signatureCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;

function getMousePos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getTouchPos(canvas, touch) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

function startDrawing(event) {
    drawing = true;
    const pos = event.type === 'mousedown' ? getMousePos(canvas, event) : getTouchPos(canvas, event.touches[0]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    event.preventDefault();
}

function stopDrawing(event) {
    drawing = false;
    ctx.closePath();
    event.preventDefault();
}

function draw(event) {
    if (!drawing) return;
    const pos = event.type === 'mousemove' ? getMousePos(canvas, event) : getTouchPos(canvas, event.touches[0]);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    event.preventDefault();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignature(id) {
    const dataURL = canvas.toDataURL('image/png');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/rinnovi/saveSignature', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            alert('Firma salvata con successo');
        }
    };
    xhr.send(JSON.stringify({ image: dataURL, id: id }));
}

// Eventi per il mouse
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);

// Eventi per il touch
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchmove', draw);