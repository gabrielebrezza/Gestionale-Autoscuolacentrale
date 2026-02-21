document.addEventListener('DOMContentLoaded', () => {

    const tbody = document.getElementById('fattureBody');
    const loader = document.getElementById('loader');
  
    const typeInput = document.getElementById('tipo');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const userInput = document.getElementById('user');
    const selectUsersBtn = document.getElementById('selectUsersBtn');
  
    let page = 0;
    const limit = 30;
    let loading = false;
    let finished = false;
  
    const buildQuery = () => {
      const params = new URLSearchParams();
      params.append('page', page);
  
      if (typeInput.value !== 'all')
        params.append('type', typeInput.value);
  
      if (fromDateInput.value)
        params.append('fromDate', fromDateInput.value);
  
      if (toDateInput.value)
        params.append('toDate', toDateInput.value);
  
      if (userInput.value.trim())
        params.append('user', userInput.value.trim());
  
      return params.toString();
    };
  
    const renderRows = (fatture) => {
      for (const f of fatture) {
        const tr = document.createElement('tr');
  
        tr.innerHTML = `
          <td>
            <input type="checkbox" class="checkboxFatture"
              name="${f.nomeFile}"
              value="${f.nomeFile}"
              style="display:${selectUsersBtn.checked ? 'inline-flex' : 'none'};">
          </td>
          <td>${f.numero}</td>
          <td>${f.data}</td>
          <td>${f.importo}€</td>
          <td>${f.nomeFile}</td>
          <td style="text-transform:capitalize;">
            ${f.user ? f.user.toLowerCase() : 'N/A'}
          </td>
          <td>
            <input type="checkbox"
              data-fatturaid="${f._id}"
              name="paid"
              ${f.nomeFile.includes('m00')
                ? (f.paid ? 'checked' : '')
                : 'disabled checked'}>
          </td>
        `;
  
        tbody.appendChild(tr);
      }
    };
  
    const loadData = async () => {
      if (loading || finished) return;
  
      loading = true;
      loader.style.display = 'block';
  
      const response = await fetch(`/admin/api/storico-fatture?${buildQuery()}`);
      const result = await response.json();
  
      if (!result.data.length) {
        finished = true;
        loader.style.display = 'none';
        return;
      }
  
      renderRows(result.data);
      page++;
  
      loader.style.display = 'none';
      loading = false;
    };
  
    // Infinite scroll
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadData();
      }
    });
  
    // Reset su cambio filtri
    const resetAndReload = () => {
      page = 0;
      finished = false;
      tbody.innerHTML = '';
      loadData();
    };
  
    typeInput.addEventListener('change', resetAndReload);
    fromDateInput.addEventListener('change', resetAndReload);
    toDateInput.addEventListener('change', resetAndReload);
  
    userInput.addEventListener('input', () => {
      clearTimeout(window._debounce);
      window._debounce = setTimeout(resetAndReload, 400);
    });
  
    // Toggle selezione checkbox (event delegation)
    selectUsersBtn.addEventListener('change', () => {
      document.querySelectorAll('.checkboxFatture')
        .forEach(cb => {
          cb.style.display = selectUsersBtn.checked ? 'inline-flex' : 'none';
        });
    });
  
    // Event delegation per checkbox pagata
    tbody.addEventListener('change', async (e) => {
      if (e.target.name === 'paid') {
        const response = await fetch('/admin/editFatturaStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paid: e.target.checked,
            id: e.target.dataset.fatturaid
          })
        });
  
        if (!response.ok) {
          alert(`Errore: ${response.status}`);
        }
      }
    });
  
    loadData();
});