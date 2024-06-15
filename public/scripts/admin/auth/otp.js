document.querySelectorAll('input[type="number"]').forEach(function(input, index, inputs) {
    input.addEventListener('input', function() {
        if (this.value.length > 0 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });
});