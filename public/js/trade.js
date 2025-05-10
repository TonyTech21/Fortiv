// Trade functionality
document.addEventListener('DOMContentLoaded', () => {
  const canTrade = document.querySelector('[data-can-trade]')?.dataset.canTrade === 'true';
  const startTradeBtn = document.getElementById('startTradeBtn');
  const tradeModal = document.getElementById('tradeModal');
  const successModal = document.getElementById('successModal');
  const errorModal = document.getElementById('errorModal');
  const amountInput = document.getElementById('tradeAmount');
  const signalSelect = document.getElementById('signalSelect');
  
  const userBalanceElements = document.querySelectorAll('.user-balance');
  const userBalance = userBalanceElements.length ? parseFloat(userBalanceElements[0].textContent.replace('$', '')) : 0;
  
  // Initialize trading chart
  initTradingChart();
  initForexTicker();
  
  if (startTradeBtn) {
    startTradeBtn.disabled = !canTrade;
    
    startTradeBtn.addEventListener('click', () => {
      showModal('tradeModal');
    });
  }
  
  window.confirmTrade = async () => {
    const amount = parseFloat(amountInput.value);
    const selectedSignal = signalSelect.value;
    
    if (!selectedSignal) {
      showModal('errorModal', 'Error', 'Please select a trading signal');
      return;
    }
    
    if (isNaN(amount) || amount < 10) {
      showModal('errorModal', 'Invalid Amount', 'Minimum trade amount is $10.00');
      return;
    }
    
    if (amount > userBalance) {
      showModal('errorModal', 'Insufficient Balance', 'You do not have enough balance for this trade.');
      return;
    }
    
    try {
      // Send trade request to server
      const response = await fetch('/user/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          signal: selectedSignal
        })
      });
      
      if (!response.ok) {
        throw new Error('Trade failed');
      }
      
      const data = await response.json();
      
      // Update all balance displays on the page
      const newBalance = data.newBalance;
      userBalanceElements.forEach(element => {
        element.textContent = `$${newBalance.toFixed(2)}`;
      });
      
      // Close trade modal and show success message
      closeModal('tradeModal');
      showSuccessMessage();
      
    } catch (error) {
      showModal('errorModal', 'Error', 'Failed to process trade. Please try again.');
    }
  };
  
  window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('show');
  };
  
  function showModal(modalId, title, message) {
    const modal = document.getElementById(modalId);
    if (modal) {
      const titleEl = modal.querySelector('.modal-title');
      const messageEl = modal.querySelector('.modal-message');
      
      if (titleEl && title) titleEl.textContent = title;
      if (messageEl && message) messageEl.textContent = message;
      
      modal.classList.add('show');
    }
  }
  
  function showSuccessMessage() {
    const modal = document.getElementById('successModal');
    const content = `
      <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <h3>Trading Initiated!</h3>
        <p>Check your email for updates. You'll receive a notification within 24 hours regarding your profit.</p>
        <button onclick="closeModal('successModal')" class="btn btn-primary">OK</button>
      </div>
    `;
    
    modal.querySelector('.modal-content').innerHTML = content;
    modal.classList.add('show');
  }
});

function initTradingChart() {
  const chartCanvas = document.getElementById('tradingChart');
  if (!chartCanvas) return;
  
  const ctx = chartCanvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: generateTimeLabels(50),
      datasets: [{
        label: 'EUR/USD',
        data: generatePriceData(50),
        borderColor: '#00c7ff',
        backgroundColor: 'rgba(0, 199, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#a0aec0'
          }
        },
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#a0aec0',
            maxRotation: 0
          }
        }
      }
    }
  });
  
  // Update chart periodically
  setInterval(() => {
    const data = chart.data.datasets[0].data;
    data.shift();
    data.push(generateNextPrice(data[data.length - 1]));
    
    const labels = chart.data.labels;
    labels.shift();
    labels.push(generateNextTimeLabel(labels[labels.length - 1]));
    
    chart.update('none');
  }, 1000);
}

function initForexTicker() {
  const ticker = document.getElementById('forexTicker');
  if (!ticker) return;
  
  const pairs = [
    { pair: 'EUR/USD', price: '1.0876', change: '+0.15%' },
    { pair: 'GBP/USD', price: '1.2534', change: '-0.08%' },
    { pair: 'USD/JPY', price: '148.92', change: '+0.25%' },
    { pair: 'USD/CHF', price: '0.8765', change: '-0.12%' }
  ];
  
  const tickerContent = document.createElement('div');
  tickerContent.className = 'ticker-content';
  
  pairs.forEach(pair => {
    const item = document.createElement('div');
    item.className = 'ticker-item';
    const changeClass = parseFloat(pair.change) >= 0 ? 'positive' : 'negative';
    
    item.innerHTML = `
      <span class="ticker-pair">${pair.pair}</span>
      <span class="ticker-price">${pair.price}</span>
      <span class="ticker-change ${changeClass}">${pair.change}</span>
    `;
    
    tickerContent.appendChild(item);
  });
  
  ticker.appendChild(tickerContent.cloneNode(true));
  ticker.appendChild(tickerContent.cloneNode(true));
}

function generateTimeLabels(count) {
  const labels = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * 60000);
    labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  }
  
  return labels;
}

function generatePriceData(count) {
  const data = [];
  let price = 1.0850;
  
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.5) * 0.0010;
    data.push(price);
  }
  
  return data;
}

function generateNextPrice(lastPrice) {
  return lastPrice + (Math.random() - 0.5) * 0.0010;
}

function generateNextTimeLabel(lastLabel) {
  const time = new Date();
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}