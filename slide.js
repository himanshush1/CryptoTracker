// API Configuration
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const DISPLAY_LIMIT = 50;
let currentCurrency = 'usd';
let cryptoChart = null;

// Theme Management
const themeSwitch = document.getElementById('theme-switch');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.add(`${savedTheme}-theme`);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('bi-moon');
        themeIcon.classList.add('bi-sun');
    } else {
        themeIcon.classList.remove('bi-sun');
        themeIcon.classList.add('bi-moon');
    }
}

// Theme Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('theme-switch');
    const themeIcon = document.getElementById('theme-icon');

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Theme switch event listener
    themeSwitch.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        applyTheme(newTheme);
    });

    function applyTheme(theme) {
        // Toggle body class
        document.body.classList.toggle('dark-theme', theme === 'dark');
        document.body.classList.toggle('light-theme', theme === 'light');

        // Update localStorage
        localStorage.setItem('theme', theme);

        // Update theme toggle icon
        if (theme === 'dark') {
            themeIcon.classList.remove('bi-moon');
            themeIcon.classList.add('bi-sun');
        } else {
            themeIcon.classList.remove('bi-sun');
            themeIcon.classList.add('bi-moon');
        }

        // Additional theme-specific element updates
        updateThemeElements(theme);
    }

    function updateThemeElements(theme) {
        // You can add more specific theme updates here
        const header = document.querySelector('header');
        if (header) {
            header.classList.toggle('bg-primary', theme === 'light');
            header.classList.toggle('bg-dark', theme === 'dark');
        }

        // Update other elements as needed
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.classList.toggle('dropdown-menu-dark', theme === 'dark');
        });
    }
});

// Additional initialization code can go here

// Cryptocurrency Data Fetching
async function fetchCryptocurrencies() {
    try {
        const response = await fetch(`${COINGECKO_API_BASE_URL}/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=${DISPLAY_LIMIT}&page=1&sparkline=false`);
        const data = await response.json();
        renderCryptoList(data);
    } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        alert('Failed to fetch cryptocurrency data. Please try again later.');
    }
}

function renderCryptoList(cryptos) {
    const cryptoList = document.getElementById('crypto-list');
    cryptoList.innerHTML = '';

    cryptos.forEach((crypto, index) => {
        const changeClass = crypto.price_change_percentage_24h >= 0 ? 'positive-change' : 'negative-change';
        const row = `
            <tr data-id="${crypto.id}">
                <td>${index + 1}</td>
                <td>
                    <img src="${crypto.image}" width="25" class="me-2">
                    ${crypto.name} (${crypto.symbol.toUpperCase()})
                </td>
                <td>${formatCurrency(crypto.current_price, currentCurrency)}</td>
                <td class="${changeClass}">${crypto.price_change_percentage_24h.toFixed(2)}%</td>
                <td>${formatCurrency(crypto.market_cap, currentCurrency)}</td>
                <td>
                    <i class="bi bi-star favorite-star" data-id="${crypto.id}"></i>
                    <button class="btn btn-sm btn-info details-btn" data-id="${crypto.id}">Details</button>
                </td>
            </tr>
        `;
        cryptoList.innerHTML += row;
    });

    setupEventListeners();
}

function formatCurrency(value, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumSignificantDigits: 6
    }).format(value);
}

// Cryptocurrency Details
async function fetchCryptoDetails(cryptoId) {
    try {
        const [details, historicalData] = await Promise.all([
            fetch(`${COINGECKO_API_BASE_URL}/coins/${cryptoId}`).then(res => res.json()),
            fetch(`${COINGECKO_API_BASE_URL}/coins/${cryptoId}/market_chart?vs_currency=${currentCurrency}&days=30`).then(res => res.json())
        ]);

        displayCryptoDetails(details, historicalData);
    } catch (error) {
        console.error('Error fetching cryptocurrency details:', error);
    }
}

function displayCryptoDetails(details, historicalData) {
    const modal = new bootstrap.Modal(document.getElementById('crypto-details-modal'));
    document.getElementById('crypto-name').textContent = details.name;

    // Update stats
    const statsContainer = document.getElementById('crypto-stats');
    statsContainer.innerHTML = `
        <tr><th>Current Price</th><td>${formatCurrency(details.market_data.current_price[currentCurrency], currentCurrency)}</td></tr>
        <tr><th>Market Cap</th><td>${formatCurrency(details.market_data.market_cap[currentCurrency], currentCurrency)}</td></tr>
        <tr><th>24h Trading Volume</th><td>${formatCurrency(details.market_data.total_volume[currentCurrency], currentCurrency)}</td></tr>
        <tr><th>Circulating Supply</th><td>${details.market_data.circulating_supply.toLocaleString()}</td></tr>
        <tr><th>Total Supply</th><td>${details.market_data.total_supply.toLocaleString()}</td></tr>
    `;

    // Create price chart
    createPriceChart(historicalData.prices, details.name);
    
    modal.show();
}

function createPriceChart(prices, cryptoName) {
    const ctx = document.getElementById('price-chart');
    
    // Destroy previous chart if exists
    if (cryptoChart) {
        cryptoChart.destroy();
    }

    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: prices.map(price => new Date(price[0]).toLocaleDateString()),
            datasets: [{
                label: `${cryptoName} Price (30 Days)`,
                data: prices.map(price => price[1]),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Cryptocurrency Details
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cryptoId = e.target.getAttribute('data-id');
            fetchCryptoDetails(cryptoId);
        });
    });

    // Favorite Toggle
    document.querySelectorAll('.favorite-star').forEach(star => {
        star.addEventListener('click', (e) => {
            const cryptoId = e.target.getAttribute('data-id');
            toggleFavorite(e.target, cryptoId);
        });
    });
}

// Favorites Management
function toggleFavorite(starElement, cryptoId) {
    starElement.classList.toggle('active');
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(cryptoId);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(cryptoId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
}

function updateFavoritesList() {
    const favoritesList = document.getElementById('favorites-list');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    favoritesList.innerHTML = '';
    
    favorites.forEach(async (cryptoId) => {
        try {
            const response = await fetch(`${COINGECKO_API_BASE_URL}/coins/${cryptoId}`);
            const crypto = await response.json();
            
            const listItem = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <img src="${crypto.image.small}" width="25" class="me-2">
                        ${crypto.name} (${crypto.symbol.toUpperCase()})
                    </div>
                    <div>
                        <span class="badge bg-primary">${formatCurrency(crypto.market_data.current_price[currentCurrency], currentCurrency)}</span>
                        <button class="btn btn-sm btn-danger remove-favorite" data-id="${cryptoId}">Remove</button>
                    </div>
                </li>
            `;
            
            favoritesList.innerHTML += listItem;
            
            // Add event listener to remove favorite
            document.querySelectorAll('.remove-favorite').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const cryptoId = e.target.getAttribute('data-id');
                    removeFavorite(cryptoId);
                });
            });
        } catch (error) {
            console.error(`Error fetching favorite crypto ${cryptoId}:`, error);
        }
    });
}

function removeFavorite(cryptoId) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const updatedFavorites = favorites.filter(id => id !== cryptoId);
    
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    updateFavoritesList();
    
    // Update star icon in the main list
    const starElement = document.querySelector(`.favorite-star[data-id="${cryptoId}"]`);
    if (starElement) {
        starElement.classList.remove('active');
    }
}

// Initialize app
function initApp() {
    initTheme();
    fetchCryptocurrencies();
    updateFavoritesList();
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);