document.addEventListener('DOMContentLoaded', () => {
    const inputSigningFile = document.getElementById('inputSigningFile');
    const cropImage = document.getElementById('cropImage');
    const croppedImageInput = document.getElementById('croppedImage');
    const croppedImagePreview = document.getElementById('signPic');
    let cropper;

    inputSigningFile.onchange = function(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            const url = URL.createObjectURL(file);
            cropImage.src = url;

            if (cropper) {
                cropper.destroy();
            }

            cropper = new Cropper(cropImage, {
                aspectRatio: 236 / 47,
                viewMode: 0,
                autoCropArea: 1,
                crop(event) {
                    const canvas = cropper.getCroppedCanvas({
                        width: 236,
                        height: 47,
                        fillColor: 'white'
                    });

                    const croppedDataUrl = canvas.toDataURL('image/jpeg');
                    croppedImagePreview.src = croppedDataUrl;
                },
            });

            document.getElementById('cropContainer').style.display = 'block';

        }
    };

    document.getElementById('firmaImageForm').addEventListener('submit', event => {
        event.preventDefault();
        const payload = {
            image: croppedImagePreview.src,
            location: document.getElementById('firmaLocation').value,
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
            alert('Firma Salvata Con Successo!');
            window.location.reload()
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
});