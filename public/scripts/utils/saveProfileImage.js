document.addEventListener('DOMContentLoaded', () => {

    const profilePic = document.getElementById('profilePic');
    const inputProfileFile = document.getElementById('inputProfileFile');
    inputProfileFile.addEventListener('change', () => {
        profilePic.src = URL.createObjectURL(inputProfileFile.files[0]);
    });

    document.getElementById('profileImageForm').addEventListener('submit', event => {
        event.preventDefault();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 260;
        canvas.height = 315;
        
        const img = new Image();
        img.src = document.getElementById('profilePic').src;
        img.onload = function() {
            const aspectRatio = img.width / img.height;
            const canvasAspectRatio = canvas.width / canvas.height;

            let srcX, srcY, srcWidth, srcHeight;
            if (aspectRatio > canvasAspectRatio) {
                // Immagine più larga del canvas
                srcHeight = img.height;
                srcWidth = img.height * canvasAspectRatio;
                srcX = (img.width - srcWidth) / 2;
                srcY = 0;
            } else {
                // Immagine più alta del canvas
                srcWidth = img.width;
                srcHeight = img.width / canvasAspectRatio;
                srcX = 0;
                srcY = (img.height - srcHeight) / 2;
            }

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg');
            document.getElementById('profilePic').src = dataUrl;
            const payload = {
                image: dataUrl,
                location: document.getElementById('profileLocation').value,
                id: document.querySelector('input[name="id"]').value
            };
            fetch('/uploadUserImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                alert('Immagine Profilo Salvata Con Successo!');
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        };
    });
});