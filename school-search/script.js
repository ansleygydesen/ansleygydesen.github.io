document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const suggestionsBox = document.getElementById('suggestions');
    const resultContainer = document.getElementById('resultContainer');
    const districtNameHeading = document.getElementById('districtName');
    const statsTable = document.getElementById('statsTable');
    let chartInstance = null;
    let districtData = [];

    // Fetch and parse CSV
    Papa.parse("district_data.csv", {
        download: true,
        header: true,
        dynamicTyping: true, // Converts numbers automatically
        complete: function(results) {
            districtData = results.data;
            console.log("Data loaded:", districtData.length, "entries");
        },
        error: function(error) {
            console.error("Error parsing CSV:", error);
            document.querySelector('.container').innerHTML += `<p style="color:red; text-align:center;">Error loading data content. Make sure district_data.csv is accessible.</p>`;
        }
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        suggestionsBox.innerHTML = '';
        
        if (query.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        const matches = districtData.filter(d => 
            d.clean_name && typeof d.clean_name === 'string' && d.clean_name.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            suggestionsBox.style.display = 'block';
            matches.slice(0, 5).forEach(match => { // Limit to 5 suggestions
                const div = document.createElement('div');
                div.classList.add('suggestion-item');
                div.textContent = match.clean_name;
                div.addEventListener('click', () => {
                    selectDistrict(match);
                });
                suggestionsBox.appendChild(div);
            });
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    });

    function selectDistrict(district) {
        searchInput.value = district.clean_name;
        suggestionsBox.style.display = 'none';
        displayResult(district);
    }

    function displayResult(district) {
        resultContainer.classList.remove('hidden');
        districtNameHeading.textContent = district.clean_name;

        // Extract years and values
        // Assuming the CSV structure matches the file view: clean_name, 20242025, 20232024, etc.
        // We get keys that look like years.
        const keys = Object.keys(district);
        const yearKeys = keys.filter(k => k !== 'clean_name' && !isNaN(parseInt(k)));
        
        // Sort years if needed (usually 20242025 is greater but let's check order)
        // The file has descending order: 20242025, 20232024...
        // Chart usually looks better left-to-right (old-to-new)
        yearKeys.sort((a, b) => parseInt(a) - parseInt(b));

        const years = yearKeys.map(key => {
            // Format 20242025 -> 2024-2025
            const yearStr = String(key);
            if (yearStr.length === 8) {
                return `${yearStr.substring(0, 4)}-${yearStr.substring(4)}`;
            }
            return key;
        });

        const dataPoints = yearKeys.map(key => district[key]);

        // Create Table content
        let tableHtml = '';
        // Show newest first in table
        for (let i = yearKeys.length - 1; i >= 0; i--) {
            const val = dataPoints[i];
            const displayVal = (val === 'NA' || val === null || val === undefined) ? 'N/A' : val + '%';
            tableHtml += `
                <div class="stat-row">
                    <span>${years[i]}</span>
                    <strong>${displayVal}</strong>
                </div>
            `;
        }
        statsTable.innerHTML = tableHtml;

        // Chart
        updateChart(years, dataPoints);
    }

    function updateChart(labels, data) {
        const ctx = document.getElementById('absenteeChart').getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
        }

        // Handle NA for chart: Chart.js handles nulls by breaking the line, which is usually correct
        const chartData = data.map(d => (d === 'NA' || d === null) ? null : parseFloat(d));

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Chronic Absenteeism Rate (%)',
                    data: chartData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.3, // Smooth curves
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percent Absent'
                        },
                        suggestedMax: Math.max(...chartData.filter(n => n !== null)) + 5
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'School Year'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true, 
                        position: 'top'
                    },
                    tooltip: {
                         callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
});
