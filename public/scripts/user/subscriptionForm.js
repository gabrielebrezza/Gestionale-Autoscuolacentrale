    const paymentMethod = document.getElementById('paymentMethod');
    const payPal = document.getElementById('payPal');
    const satispay = document.getElementById('satisPay');
    const codeBtn = document.getElementById('codeBtn');
    const codeContainer = document.getElementById('codeContainer');
    const codeInput = document.getElementById('code');
    const stripe = document.getElementById('stripe');
    payPal.addEventListener('click', () => paymentMethod.value = 'payPal');
    stripe.addEventListener('click', () => paymentMethod.value = 'stripe');
    satispay.addEventListener('click', () => paymentMethod.value = 'satispay');
    codeBtn.addEventListener('click', event => {
        event.preventDefault();
        codeContainer.style.display = 'flex';
        paymentMethod.value = 'code';
        codeInput.required = true;
    });

    const year = document.getElementById('anno');
    var oggi = new Date()
    var centoAnniFa = new Date();
    centoAnniFa.setFullYear(oggi.getFullYear() - 100);

    year.setAttribute("min", centoAnniFa.getFullYear());
    year.setAttribute("max", (oggi.getFullYear() - 14));

    const giorno = document.getElementById('giorno');
    giorno.addEventListener('input', () => {
        if(giorno.value > 2) giorno.value = giorno.value.slice(0,2);
    });