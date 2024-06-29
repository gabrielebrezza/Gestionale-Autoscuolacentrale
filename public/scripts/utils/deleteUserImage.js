document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.deleteButton').forEach(function(button) {
        button.addEventListener('click', function() {
            const form = this.closest('form');
            form.querySelector('img').src = '';
            const id = form.querySelector('input[name="id"]').value;
            const location = form.querySelector('input[name="location"]').value;
            const payload = {
                location: location,
                id: id
            };
            fetch('/deleteUserImage', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                window.location.reload();
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });
    });
});