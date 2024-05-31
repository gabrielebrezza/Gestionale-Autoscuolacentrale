    const paymentMethod = document.getElementById('paymentMethod');
    const payPal = document.getElementById('payPal');
    // const stripe = document.getElementById('stripe')
    payPal.addEventListener('click', () => paymentMethod.value = 'payPal');
    // stripe.addEventListener('click', () => paymentMethod.value = 'stripe')

    const year = document.getElementById('anno');
    var oggi = new Date()
    var centoAnniFa = new Date();
    centoAnniFa.setFullYear(oggi.getFullYear() - 100);

    year.setAttribute("min", centoAnniFa.getFullYear());
    year.setAttribute("max", (oggi.getFullYear() - 14));