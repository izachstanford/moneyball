// Main application
import './utils/dataLoader.js';

class MoneballApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.selectedPlayers = [];
        this.draftedPlayers = [];
        this.currentPage = 'draft-board';
        this.currentMode = 'averages';
        
        this.init();
    }

    async init() {
        try {
            await this.dataLoader.loadData();
            this.setupEventListeners();
            this.renderCurrentPage();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Draft Board
        this.setupDraftBoardEvents();
        
        // Trends (formerly Historical Analysis)
        this.setupHistoricalAnalysisEvents();
        
        // Breakouts (formerly Trends)
        this.setupTrendsEvents();
        
        // Insights
        this.setupInsightsEvents();
    }


    setupHistoricalAnalysisEvents() {
        const searchInput = document.getElementById('historical-search-input');
        const searchResults = document.getElementById('historical-search-results');
        const positionFilter = document.getElementById('historical-position-filter');
        const categoryFilter = document.getElementById('historical-category-filter');
        const minGamesInput = document.getElementById('historical-min-games');
        const rankTypeToggles = document.querySelectorAll('#trends .toggle');

        // Initialize selected players array
        this.historicalSelectedPlayers = [];

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                searchResults.classList.remove('show');
                return;
            }

            const results = this.dataLoader.searchPlayers(query);
            this.renderHistoricalSearchResults(results);
        });

        // Click outside to close search
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });

        [positionFilter, categoryFilter, minGamesInput].forEach(control => {
            control.addEventListener('change', () => this.renderHistoricalAnalysis());
        });

        rankTypeToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                rankTypeToggles.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.renderHistoricalAnalysis();
            });
        });
    }

    renderHistoricalSearchResults(results) {
        const container = document.getElementById('historical-search-results');
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-result">No players found</div>';
            container.classList.add('show');
            return;
        }

        container.innerHTML = results.map(player => `
            <div class="search-result" data-player-id="${player.player_id}">
                <div class="search-result-info">
                    <div class="search-result-name">${player.name}</div>
                    <div class="search-result-meta">
                        ${player.positions.join('/')} • ${player.team}
                    </div>
                </div>
            </div>
        `).join('');

        container.classList.add('show');

        // Add click handlers
        container.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', (e) => {
                const playerId = e.currentTarget.dataset.playerId;
                this.addPlayerToHistoricalAnalysis(playerId);
                container.classList.remove('show');
                document.getElementById('historical-search-input').value = '';
            });
        });
    }

    addPlayerToHistoricalAnalysis(playerId) {
        if (this.historicalSelectedPlayers.includes(playerId)) return;
        
        this.historicalSelectedPlayers.push(playerId);
        this.renderHistoricalSelectedPlayers();
        this.renderHistoricalAnalysis();
    }

    removePlayerFromHistoricalAnalysis(playerId) {
        this.historicalSelectedPlayers = this.historicalSelectedPlayers.filter(id => id !== playerId);
        this.renderHistoricalSelectedPlayers();
        this.renderHistoricalAnalysis();
    }

    renderHistoricalSelectedPlayers() {
        const container = document.getElementById('historical-selected-players');
        
        if (this.historicalSelectedPlayers.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.historicalSelectedPlayers.map(playerId => {
            const player = this.dataLoader.getPlayer(playerId);
            return `
                <div class="selected-player">
                    <span class="selected-player-name">${player.name}</span>
                    <button class="remove-player" data-player-id="${playerId}">&times;</button>
                </div>
            `;
        }).join('');

        // Add remove handlers
        container.querySelectorAll('.remove-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                this.removePlayerFromHistoricalAnalysis(playerId);
            });
        });
    }

    setupTrendsEvents() {
        document.querySelectorAll('#breakouts .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#breakouts .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderTrends();
            });
        });
    }

    setupDraftBoardEvents() {
        const positionFilter = document.getElementById('draft-position-filter');
        const hideDrafted = document.getElementById('hide-drafted');

        [positionFilter, hideDrafted].forEach(control => {
            control.addEventListener('change', () => this.renderDraftBoard());
        });
    }

    navigateToPage(page) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === page);
        });

        this.currentPage = page;
        this.renderCurrentPage();
    }

    renderCurrentPage() {
        switch (this.currentPage) {
            case 'draft-board':
                this.renderDraftBoard();
                break;
            case 'trends':
                this.renderHistoricalAnalysis();
                break;
            case 'breakouts':
                this.renderTrends();
                break;
            case 'insights':
                this.renderInsights();
                break;
        }
    }

    renderSearchResults(results) {
        const container = document.getElementById('player-search-results');
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-result">No players found</div>';
            container.classList.add('show');
            return;
        }

        container.innerHTML = results.map(player => `
            <div class="search-result" data-player-id="${player.player_id}">
                <div class="search-result-info">
                    <div class="search-result-name">${player.name}</div>
                    <div class="search-result-meta">
                        ${player.positions.join('/')} • ${player.team}
                        ${player.adp ? ` • ADP ${player.adp.toFixed(1)}` : ''}
                        ${player.rookie ? ' • ROOKIE' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.classList.add('show');

        // Add click handlers
        container.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', (e) => {
                const playerId = e.currentTarget.dataset.playerId;
                this.addPlayerToComparison(playerId);
                container.classList.remove('show');
                document.getElementById('player-search-input').value = '';
            });
        });
    }

    addPlayerToComparison(playerId) {
        if (this.selectedPlayers.includes(playerId)) return;
        if (this.selectedPlayers.length >= 5) {
            this.selectedPlayers.shift(); // Remove oldest if at limit
        }
        
        this.selectedPlayers.push(playerId);
        this.renderSelectedPlayers();
        this.renderPlayerComparison();
    }

    removePlayerFromComparison(playerId) {
        this.selectedPlayers = this.selectedPlayers.filter(id => id !== playerId);
        this.renderSelectedPlayers();
        this.renderPlayerComparison();
    }

    renderSelectedPlayers() {
        const container = document.getElementById('selected-players');
        
        container.innerHTML = this.selectedPlayers.map(playerId => {
            const player = this.dataLoader.getPlayer(playerId);
            return `
                <div class="selected-player">
                    <span class="selected-player-name">${player.name}</span>
                    <button class="remove-player" data-player-id="${playerId}">&times;</button>
                </div>
            `;
        }).join('');

        // Add remove handlers
        container.querySelectorAll('.remove-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                this.removePlayerFromComparison(playerId);
            });
        });
    }

    renderPlayerComparison() {
        const container = document.getElementById('player-comparison');
        
        if (this.selectedPlayers.length === 0) {
            container.innerHTML = '<div class="loading">Select players to compare</div>';
            return;
        }

        const categories = this.dataLoader.categories;
        const players = this.selectedPlayers.map(id => ({
            id,
            data: this.dataLoader.getPlayer(id),
            latestSeason: this.dataLoader.getLatestSeasonData(id)
        }));

        // Get values for percentile calculations
        const allValues = {};
        categories.forEach(cat => {
            allValues[cat] = [];
            players.forEach(p => {
                if (p.latestSeason) {
                    const value = this.getCategoryValue(p.latestSeason, cat, this.currentMode);
                    if (value !== null) allValues[cat].push(value);
                }
            });
            allValues[cat].sort((a, b) => a - b);
        });

        container.innerHTML = `
            <div class="comparison-section">
                <h3>Category Comparison</h3>
                <div class="comparison-grid">
                    <div class="category-row">
                        <div class="category-label"></div>
                        ${players.map(p => `
                            <div class="player-header">
                                <div class="player-name">${p.data.name}</div>
                                <div class="player-meta">${p.data.positions.join('/')} • ${p.data.latest_team}</div>
                            </div>
                        `).join('')}
                    </div>
                    ${categories.map(cat => this.renderCategoryRow(cat, players, allValues[cat])).join('')}
                </div>
            </div>
        `;
    }

    renderCategoryRow(category, players, allValues) {
        return `
            <div class="category-row">
                <div class="category-label">${category}</div>
                ${players.map(p => {
                    if (!p.latestSeason) {
                        return '<div class="category-value">-</div>';
                    }
                    
                    const value = this.getCategoryValue(p.latestSeason, category, this.currentMode);
                    const percentile = this.calculatePercentile(value, allValues);
                    
                    return `
                        <div class="category-value">
                            <div class="value-number">${this.dataLoader.formatValue(value, category)}</div>
                            <div class="percentile-bar">
                                <div class="percentile-fill" style="width: ${percentile}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    getCategoryValue(seasonData, category, mode) {
        if (!seasonData) return null;
        
        const source = mode === 'zscores' ? seasonData.zscores : 
                      mode === 'totals' ? seasonData.totals : 
                      seasonData.averages;
        
        if (!source) return null;

        switch (category) {
            case 'PTS':
                return mode === 'zscores' ? source.Z_PTS_G :
                       mode === 'totals' ? source.PTS :
                       source.PTS_G;
            case 'REB':
                return mode === 'zscores' ? source.Z_REB_G :
                       mode === 'totals' ? source.TRB :
                       source.REB_G;
            case 'AST':
                return mode === 'zscores' ? source.Z_AST_G :
                       mode === 'totals' ? source.AST :
                       source.AST_G;
            case 'STL':
                return mode === 'zscores' ? source.Z_STL_G :
                       mode === 'totals' ? source.STL :
                       source.STL_G;
            case 'BLK':
                return mode === 'zscores' ? source.Z_BLK_G :
                       mode === 'totals' ? source.BLK :
                       source.BLK_G;
            case '3PM':
                return mode === 'zscores' ? source.Z_3PM_G :
                       mode === 'totals' ? source['3P'] :
                       source['3PM_G'];
            case 'FG%':
                return mode === 'zscores' ? source.Z_FG_PCT :
                       source.FG_PCT;
            case 'FT%':
                return mode === 'zscores' ? source.Z_FT_PCT :
                       source.FT_PCT;
            case 'TOV':
                return mode === 'zscores' ? source.Z_TOV_G :
                       mode === 'totals' ? source.TOV :
                       source.TOV_G;
            default:
                return null;
        }
    }

    calculatePercentile(value, allValues) {
        if (value === null || allValues.length === 0) return 0;
        
        let count = 0;
        for (let v of allValues) {
            if (v <= value) count++;
        }
        return (count / allValues.length) * 100;
    }

    renderLeaderboard() {
        const container = document.getElementById('leaderboard-table');
        const season = document.getElementById('season-filter').value;
        const position = document.getElementById('position-filter').value;
        const minGames = parseInt(document.getElementById('min-games').value) || 0;
        const rankType = document.querySelector('#leaderboard .toggle.active').dataset.rankType;

        const players = this.dataLoader.getLeaderboard({
            season: season || null,
            position: position || null,
            minGames,
            rankType
        });

        if (players.length === 0) {
            container.innerHTML = '<div class="loading">No players found</div>';
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <div class="table-cell">Player</div>
                <div class="table-cell">Rank</div>
                <div class="table-cell">PTS</div>
                <div class="table-cell">REB</div>
                <div class="table-cell">AST</div>
                <div class="table-cell">STL</div>
                <div class="table-cell">BLK</div>
                <div class="table-cell">3PM</div>
                <div class="table-cell">FG%</div>
                <div class="table-cell">FT%</div>
                <div class="table-cell">GP</div>
            </div>
            ${players.slice(0, 100).map(p => this.renderLeaderboardRow(p, rankType)).join('')}
        `;
    }

    renderLeaderboardRow(playerData, rankType) {
        const { player, seasonData, rank } = playerData;
        const avg = seasonData.averages || {};
        const games = seasonData.meta?.games_played || 0;
        const tierClass = this.dataLoader.getRankTier(rank);

        return `
            <div class="table-row">
                <div class="table-cell">
                    <div class="player-name">${player.name}</div>
                    <div class="player-meta">${player.positions.join('/')} • ${player.latest_team}</div>
                </div>
                <div class="table-cell">
                    <span class="rank-badge ${tierClass}">${rank}</span>
                </div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.PTS_G, 'PTS')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.REB_G, 'REB')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.AST_G, 'AST')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.STL_G, 'STL')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.BLK_G, 'BLK')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg['3PM_G'], '3PM')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.FG_PCT, 'FG%')}</div>
                <div class="table-cell number">${this.dataLoader.formatValue(avg.FT_PCT, 'FT%')}</div>
                <div class="table-cell number">${games}</div>
            </div>
        `;
    }

    renderHistoricalAnalysis() {
        const contentContainer = document.getElementById('historical-content');
        
        const position = document.getElementById('historical-position-filter').value;
        const category = document.getElementById('historical-category-filter').value;
        const minGamesPerSeason = parseInt(document.getElementById('historical-min-games').value) || 20;
        const rankType = document.querySelector('#historical-analysis .toggle.active').dataset.rankType;

        // If specific players are selected, show only those
        let players;
        if (this.historicalSelectedPlayers && this.historicalSelectedPlayers.length > 0) {
            const allPlayers = this.dataLoader.getHistoricalAnalysis({
                position: null,
                category: null,
                minSeasons: 2,
                minGamesPerSeason,
                rankType
            });
            players = allPlayers.filter(p => this.historicalSelectedPlayers.includes(p.playerId));
        } else {
            players = this.dataLoader.getHistoricalAnalysis({
                position: position || null,
                category: category || null,
                minSeasons: 2,
                minGamesPerSeason,
                rankType
            });
        }

        if (players.length === 0) {
            contentContainer.innerHTML = '<div class="loading">No players found with the selected criteria</div>';
            return;
        }

        const categoryInfo = this.dataLoader.getCategoryInfo();

        // Group players by category
        const playersByCategory = {};
        players.forEach(p => {
            if (!playersByCategory[p.category]) {
                playersByCategory[p.category] = [];
            }
            playersByCategory[p.category].push(p);
        });

        // Render players grouped by category
        contentContainer.innerHTML = Object.entries(playersByCategory).map(([cat, categoryPlayers]) => {
            const info = categoryInfo[cat];
            return `
                <div class="historical-category-section">
                    <div class="category-section-header" style="border-left: 4px solid ${info.color}">
                        <span class="category-icon">${info.icon}</span>
                        <h3>${info.title}</h3>
                        <span class="player-count">(${categoryPlayers.length} players)</span>
                    </div>
                    <div class="historical-players-grid">
                        ${categoryPlayers.slice(0, 50).map(p => this.renderHistoricalPlayerCard(p, info.color)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderHistoricalPlayerCard(playerData, categoryColor) {
        const { player, avgRank, consistency, bestRank, worstRank, rankTrend, validSeasonData, age } = playerData;
        const tierClass = this.dataLoader.getRankTier(Math.round(avgRank));
        const consistencyRating = this.dataLoader.getConsistencyRating(consistency);
        
        // Create trend sparkline
        const seasonLabels = validSeasonData.map(s => this.dataLoader.getSeasonDisplayName(s.season));
        const ranks = validSeasonData.map(s => s.rank);
        
        // Calculate sparkline path (simple line chart)
        const maxRank = Math.max(...ranks, 100);
        const minRank = Math.min(...ranks);
        const rankRange = maxRank - minRank || 1;
        
        const svgWidth = 120;
        const svgHeight = 40;
        const padding = 5;
        const plotWidth = svgWidth - padding * 2;
        const plotHeight = svgHeight - padding * 2;
        
        const points = ranks.map((rank, i) => {
            const x = padding + (i / (ranks.length - 1 || 1)) * plotWidth;
            // Lower rank (better) = lower Y position (visually trending down = improving)
            const y = padding + ((rank - minRank) / rankRange) * plotHeight;
            return `${x},${y}`;
        }).join(' ');

        // Determine trend indicator
        let trendDisplay = '';
        let trendClass = 'trend-neutral';
        if (rankTrend > 10) {
            trendDisplay = `↑ ${Math.abs(rankTrend).toFixed(0)}`;
            trendClass = 'trend-up';
        } else if (rankTrend < -10) {
            trendDisplay = `↓ ${Math.abs(rankTrend).toFixed(0)}`;
            trendClass = 'trend-down';
        } else {
            trendDisplay = '→ Stable';
        }

        return `
            <div class="historical-player-card" style="border-top: 3px solid ${categoryColor}">
                <div class="player-card-header">
                    <div>
                        <div class="player-name">${player.name}</div>
                        <div class="player-meta">
                            ${player.positions.join('/')} • ${player.latest_team}
                            ${age ? ` • Age ${age}` : ''}
                        </div>
                    </div>
                    <span class="rank-badge ${tierClass}">${avgRank.toFixed(1)}</span>
                </div>
                
                <div class="player-card-chart">
                    <svg width="${svgWidth}" height="${svgHeight}" class="trend-sparkline">
                        <polyline
                            points="${points}"
                            fill="none"
                            stroke="${categoryColor}"
                            stroke-width="2"
                        />
                        ${ranks.map((rank, i) => {
                            const x = padding + (i / (ranks.length - 1 || 1)) * plotWidth;
                            const y = padding + ((rank - minRank) / rankRange) * plotHeight;
                            return `<circle cx="${x}" cy="${y}" r="3" fill="${categoryColor}" />`;
                        }).join('')}
                    </svg>
                    <div class="chart-labels">
                        ${seasonLabels.map((label, i) => `
                            <div class="chart-label">
                                <span class="season-label">${label}</span>
                                <span class="rank-value">#${ranks[i]}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="player-card-metrics">
                    <div class="metric">
                        <div class="metric-label">Trend</div>
                        <div class="metric-value ${trendClass}">${trendDisplay}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Best</div>
                        <div class="metric-value">#${bestRank}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Worst</div>
                        <div class="metric-value">#${worstRank}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Consistency</div>
                        <div class="metric-value">${consistencyRating}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTrends() {
        const container = document.getElementById('breakouts-content');
        const activeFilter = document.querySelector('#breakouts .filter-btn.active').dataset.filter;
        
        let data = [];
        
        switch (activeFilter) {
            case 'breakouts':
                data = this.dataLoader.getBreakoutCandidates().slice(0, 20);
                break;
            case 'undervalued':
                data = this.dataLoader.getUndervaluedPlayers().slice(0, 20);
                break;
            case 'declining':
                // Could implement declining players logic
                data = [];
                break;
            default:
                data = [
                    ...this.dataLoader.getBreakoutCandidates().slice(0, 10),
                    ...this.dataLoader.getUndervaluedPlayers().slice(0, 10)
                ];
        }

        if (data.length === 0) {
            container.innerHTML = '<div class="loading">No players found for this filter</div>';
            return;
        }

        container.innerHTML = data.map(item => this.renderTrendCard(item)).join('');
    }

    renderTrendCard(item) {
        const { player, trends, value, reasons = [], breakoutScore } = item;
        const latestSeason = this.dataLoader.getLatestSeasonData(player.player_id);
        
        let badges = [];
        if (breakoutScore) badges.push(`<span class="trend-badge breakout">Breakout</span>`);
        if (value && value.value > 15) badges.push(`<span class="trend-badge undervalued">Undervalued</span>`);
        
        return `
            <div class="trend-card">
                <div class="trend-header">
                    <div class="trend-player-info">
                        <div class="trend-player-name">${player.name}</div>
                        <div class="trend-player-meta">
                            ${player.positions.join('/')} • ${player.latest_team}
                            ${latestSeason?.meta?.age ? ` • Age ${latestSeason.meta.age}` : ''}
                        </div>
                    </div>
                    <div class="trend-badges">
                        ${badges.join('')}
                    </div>
                </div>
                
                <div class="trend-metrics">
                    ${value ? `
                        <div class="trend-metric">
                            <div class="trend-metric-value">${value.adp.toFixed(1)}</div>
                            <div class="trend-metric-label">ADP</div>
                        </div>
                        <div class="trend-metric">
                            <div class="trend-metric-value">${value.rotoRank}</div>
                            <div class="trend-metric-label">Roto Rank</div>
                        </div>
                        <div class="trend-metric">
                            <div class="trend-metric-value ${value.value > 0 ? 'trend-up' : 'trend-down'}">
                                ${value.value > 0 ? '+' : ''}${value.value.toFixed(0)}
                            </div>
                            <div class="trend-metric-label">Value</div>
                        </div>
                    ` : ''}
                    ${latestSeason ? `
                        <div class="trend-metric">
                            <div class="trend-metric-value">${latestSeason.meta?.games_played || 0}</div>
                            <div class="trend-metric-label">GP</div>
                        </div>
                    ` : ''}
                </div>
                
                ${reasons.length > 0 ? `
                    <div class="trend-reasons">
                        ${reasons.map(reason => `<div class="trend-reason">• ${reason}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderDraftBoard() {
        this.renderMyTeam();
        this.renderDraftTable();
    }

    renderDraftTable() {
        const container = document.getElementById('draft-table');
        const positionFilter = document.getElementById('draft-position-filter').value;
        const hideDrafted = document.getElementById('hide-drafted').checked;
        
        let players = this.dataLoader.getPlayerList();
        
        if (positionFilter) {
            players = players.filter(p => p.positions.includes(positionFilter));
        }
        
        if (hideDrafted) {
            players = players.filter(p => !this.draftedPlayers.includes(p.player_id));
        }

        // Store players for sorting
        this.currentDraftPlayers = players;
        this.currentSortColumn = 'adp';
        this.currentSortDirection = 'asc';
        
        // Sort players initially
        const sorted = this.sortPlayers(players);
        
        container.innerHTML = `
            <div class="table-header-fixed">
                <div class="table-cell sortable" data-sort="name">Player ▾</div>
                <div class="table-cell sortable" data-sort="adp">ADP ▾</div>
                <div class="table-cell sortable" data-sort="tier">Tier ▾</div>
                <div class="table-cell sortable" data-sort="projRank">Proj Rank ▾</div>
                <div class="table-cell sortable" data-sort="projValue">Proj Value ▾</div>
                <div class="table-cell sortable" data-sort="value2024">Value vs 24 ▾</div>
                <div class="table-cell sortable" data-sort="avgRank">Avg Rank ▾</div>
                <div class="table-cell sortable" data-sort="rank2425">24-25 ▾</div>
                <div class="table-cell sortable" data-sort="rank2324">23-24 ▾</div>
                <div class="table-cell sortable" data-sort="rank2223">22-23 ▾</div>
                <div class="table-cell sortable" data-sort="consistency">Consistency ▾</div>
                <div class="table-cell sortable" data-sort="trend">Trend ▾</div>
                <div class="table-cell">Action</div>
            </div>
            <div class="table-rows-scroll">
                ${sorted.map(p => this.renderDraftRow(p)).join('')}
            </div>
        `;

        // Add sort handlers
        container.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                if (this.currentSortColumn === sortBy) {
                    this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSortColumn = sortBy;
                    this.currentSortDirection = 'asc';
                }
                
                // Update sort indicators
                container.querySelectorAll('.sortable').forEach(h => {
                    const text = h.textContent.replace(/[▾▴]/g, '').trim();
                    h.textContent = text + ' ▾';
                });
                const text = e.target.textContent.replace(/[▾▴]/g, '').trim();
                e.target.textContent = text + (this.currentSortDirection === 'asc' ? ' ▴' : ' ▾');
                
                // Re-render with new sort
                const sorted = this.sortPlayers(this.currentDraftPlayers);
                const rows = sorted.map(p => this.renderDraftRow(p)).join('');
                
                // Replace only the rows in the scroll container
                const scrollContainer = container.querySelector('.table-rows-scroll');
                if (scrollContainer) {
                    scrollContainer.innerHTML = rows;
                }
                
                // Re-attach handlers
                this.attachDraftHandlers();
            });
        });
        
        this.attachDraftHandlers();
    }

    sortPlayers(players) {
        return [...players].sort((a, b) => {
            let aVal, bVal;
            
            const aData = this.getDraftRowData(a);
            const bData = this.getDraftRowData(b);
            
            switch(this.currentSortColumn) {
                case 'name': aVal = a.name; bVal = b.name; break;
                case 'adp': aVal = aData.adp; bVal = bData.adp; break;
                case 'tier': 
                    aVal = aData.bucketTier ? parseInt(aData.bucketTier) : null;
                    bVal = bData.bucketTier ? parseInt(bData.bucketTier) : null;
                    break;
                case 'projRank': aVal = aData.projRank; bVal = bData.projRank; break;
                case 'projValue': aVal = aData.projValue; bVal = bData.projValue; break;
                case 'avgRank': aVal = aData.avgRank; bVal = bData.avgRank; break;
                case 'rank2425': aVal = aData.rank2425; bVal = bData.rank2425; break;
                case 'value2024': aVal = aData.value2024; bVal = bData.value2024; break;
                case 'rank2324': aVal = aData.rank2324; bVal = bData.rank2324; break;
                case 'rank2223': aVal = aData.rank2223; bVal = bData.rank2223; break;
                case 'consistency': aVal = aData.consistency; bVal = bData.consistency; break;
                case 'trend': aVal = aData.trendValue; bVal = bData.trendValue; break;
                default: aVal = aData.adp; bVal = bData.adp;
            }
            
            // Handle nulls
            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            
            const comparison = typeof aVal === 'string' ? 
                aVal.localeCompare(bVal) : aVal - bVal;
            
            return this.currentSortDirection === 'asc' ? comparison : -comparison;
        });
    }

    attachDraftHandlers() {

        document.querySelectorAll('.draft-btn, .undraft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                const isDrafted = this.draftedPlayers.includes(playerId);
                
                if (isDrafted) {
                    this.draftedPlayers = this.draftedPlayers.filter(id => id !== playerId);
                } else {
                    this.draftedPlayers.push(playerId);
                }
                
                this.renderDraftBoard();
            });
        });
    }

    getDraftRowData(player) {
        const playerData = this.dataLoader.getPlayer(player.player_id);

        // Get historical analysis data (but don't filter out players without it)
        let historicalData = null;
        try {
            const allHistorical = this.dataLoader.getHistoricalAnalysis({
                position: null,
                category: null,
                minSeasons: 1,
                minGamesPerSeason: 1, // Lower threshold to include more players
                rankType: 'per_game'
            });
            historicalData = allHistorical.find(p => p.playerId === player.player_id);
        } catch (e) {
            // Player may not have historical data
        }

        // Get season-specific ranks
        const seasons = playerData?.seasons || {};
        const rank2425 = seasons['2024-2025']?.ranks?.per_game_rank || null;
        const rank2324 = seasons['2023-2024']?.ranks?.per_game_rank || null;
        const rank2223 = seasons['2022-2023']?.ranks?.per_game_rank || null;

        // Bucket data
        const bucketTier = playerData?.bucket?.bucket || null;
        const projRank = playerData?.bucket?.rank || null;
        
        // Calculated values
        const adp = player.adp || null;
        const projValue = (adp && projRank) ? (adp - projRank) : null;
        const value2024 = (rank2425 && rank2324) ? (rank2324 - rank2425) : null;
        
        // Historical metrics
        const avgRank = historicalData?.avgRank || null;
        const consistency = historicalData?.consistency || null;
        const trendValue = historicalData?.rankTrend || null;

        return {
            adp, bucketTier, projRank, projValue, rank2425, value2024,
            avgRank, rank2324, rank2223, consistency, trendValue
        };
    }

    renderDraftRow(player) {
        const isDrafted = this.draftedPlayers.includes(player.player_id);
        const data = this.getDraftRowData(player);

        const formatRank = (rank) => {
            if (!rank) return '-';
            return `${rank}`;
        };

        const formatValue = (val) => {
            if (val === null) return '-';
            const valueClass = val > 0 ? 'value-positive' : val < 0 ? 'value-negative' : 'value-neutral';
            const display = val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0);
            return `<span class="value-badge ${valueClass}">${display}</span>`;
        };

        const formatTrend = (trend) => {
            if (!trend) return '-';
            const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';
            const display = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
            return `<span class="trend-indicator ${trendClass}">${display} ${Math.abs(trend).toFixed(0)}</span>`;
        };

        return `
            <div class="table-row ${isDrafted ? 'drafted' : ''}">
                <div class="table-cell">
                    <div class="player-name">${player.name}</div>
                    <div class="player-meta">
                        ${player.positions.join('/')} • ${player.team}
                        ${player.rookie ? ' • ROOKIE' : ''}
                    </div>
                </div>
                <div class="table-cell">${data.adp ? data.adp.toFixed(1) : '-'}</div>
                <div class="table-cell">${data.bucketTier || '-'}</div>
                <div class="table-cell">${data.projRank || '-'}</div>
                <div class="table-cell">${formatValue(data.projValue)}</div>
                <div class="table-cell">${formatValue(data.value2024)}</div>
                <div class="table-cell">${data.avgRank ? data.avgRank.toFixed(1) : '-'}</div>
                <div class="table-cell">${formatRank(data.rank2425)}</div>
                <div class="table-cell">${formatRank(data.rank2324)}</div>
                <div class="table-cell">${formatRank(data.rank2223)}</div>
                <div class="table-cell">
                    ${data.consistency ? `<span class="consistency-badge consistency-${this.dataLoader.getConsistencyRating(data.consistency).toLowerCase().replace(' ', '-')}">${data.consistency.toFixed(1)}</span>` : '-'}
                </div>
                <div class="table-cell">${formatTrend(data.trendValue)}</div>
                <div class="table-cell">
                    ${isDrafted ? 
                        `<button class="undraft-btn" data-player-id="${player.player_id}">Undraft</button>` :
                        `<button class="draft-btn" data-player-id="${player.player_id}">Draft</button>`
                    }
                </div>
            </div>
        `;
    }

    renderMyTeam() {
        const container = document.getElementById('my-team-content');
        
        if (!container) return;
        
        if (!this.draftedPlayers || this.draftedPlayers.length === 0) {
            container.innerHTML = '<div class="empty-team">No players drafted yet. Start building your team!</div>';
            return;
        }

        // Get historical analysis for drafted players
        const rankType = 'per_game'; // Default to per game
        const allPlayers = this.dataLoader.getHistoricalAnalysis({
            position: null,
            category: null,
            minSeasons: 2,
            minGamesPerSeason: 20,
            rankType
        });
        
        // Filter to only drafted players and sort by average rank
        const draftedPlayersData = allPlayers
            .filter(p => this.draftedPlayers.includes(p.playerId))
            .sort((a, b) => a.avgRank - b.avgRank);

        // Calculate team averages
        const teamAverages = this.calculateTeamAverages(draftedPlayersData);
        const categoryInfo = this.dataLoader.getCategoryInfo();

        container.innerHTML = `
            <div class="team-summary">
                <div class="team-stat">
                    <div class="team-stat-label">Players</div>
                    <div class="team-stat-value">${this.draftedPlayers.length}</div>
                </div>
                <div class="team-stat">
                    <div class="team-stat-label">Avg Rank</div>
                    <div class="team-stat-value">${teamAverages.avgRank.toFixed(1)}</div>
                </div>
                <div class="team-stat">
                    <div class="team-stat-label">Best Pick</div>
                    <div class="team-stat-value">#${teamAverages.bestRank}</div>
                </div>
            </div>

            <div class="team-players-table">
                <div class="table-header">
                    <div class="table-cell">Player</div>
                    <div class="table-cell">Bucket</div>
                    <div class="table-cell">Rank</div>
                    <div class="table-cell">Avg Rank</div>
                    <div class="table-cell">Category</div>
                    <div class="table-cell">22-23</div>
                    <div class="table-cell">23-24</div>
                    <div class="table-cell">24-25</div>
                    <div class="table-cell">Action</div>
                </div>
                ${draftedPlayersData.map(playerData => {
                    const { player, avgRank, category, validSeasonData } = playerData;
                    const tierClass = this.dataLoader.getRankTier(Math.round(avgRank));
                    const catInfo = categoryInfo[category];
                    
                    // Create season rank map
                    const seasonRankMap = {};
                    validSeasonData.forEach(s => {
                        seasonRankMap[s.season] = s.rank;
                    });
                    
                    const seasons = ['2022-2023', '2023-2024', '2024-2025'];
                    
                    return `
                        <div class="table-row">
                            <div class="table-cell">
                                <div class="player-name">${player.name}</div>
                                <div class="player-meta">${player.positions.join('/')} • ${player.latest_team}</div>
                            </div>
                            <div class="table-cell">
                                ${player.bucket ? `<span class="bucket-badge bucket-${player.bucket.bucket}">${player.bucket.bucket}</span>` : '-'}
                            </div>
                            <div class="table-cell">
                                ${player.bucket ? `<span class="rank-badge">${player.bucket.rank}</span>` : '-'}
                            </div>
                            <div class="table-cell">
                                <span class="rank-badge ${tierClass}">${avgRank.toFixed(1)}</span>
                            </div>
                            <div class="table-cell">
                                <span class="category-badge" style="background: ${catInfo.color}20; color: ${catInfo.color}">
                                    ${catInfo.icon} ${catInfo.title}
                                </span>
                            </div>
                            ${seasons.map(season => {
                                const rank = seasonRankMap[season];
                                if (rank) {
                                    return `<div class="table-cell"><span class="rank-badge ${this.dataLoader.getRankTier(rank)}">${rank}</span></div>`;
                                } else {
                                    return `<div class="table-cell">-</div>`;
                                }
                            }).join('')}
                            <div class="table-cell">
                                <button class="undraft-btn small" data-player-id="${player.player_id}">Remove</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Add undraft handlers
        container.querySelectorAll('.undraft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                this.draftedPlayers = this.draftedPlayers.filter(id => id !== playerId);
                this.renderDraftBoard();
            });
        });
    }

    calculateTeamAverages(draftedPlayersData) {
        if (draftedPlayersData.length === 0) {
            return { avgRank: 0, bestRank: 0 };
        }

        const totalRank = draftedPlayersData.reduce((sum, p) => sum + p.avgRank, 0);
        const avgRank = totalRank / draftedPlayersData.length;
        const bestRank = Math.min(...draftedPlayersData.map(p => p.bestRank));

        return { avgRank, bestRank };
    }

    setupInsightsEvents() {
        // Initialize selected players array for trends chart
        this.trendsSelectedPlayers = [];
        
        // Value Scatter filters
        const valuePositionFilter = document.getElementById('value-position-filter');
        const valueShowNames = document.getElementById('value-show-names');
        
        if (valuePositionFilter) {
            valuePositionFilter.addEventListener('change', () => this.renderValueScatterChart());
        }
        if (valueShowNames) {
            valueShowNames.addEventListener('change', () => this.renderValueScatterChart());
        }
        
        // Trends chart player search
        const trendsSearchInput = document.getElementById('trends-search-input');
        const trendsSearchResults = document.getElementById('trends-search-results');
        
        if (trendsSearchInput) {
            trendsSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length < 2) {
                    trendsSearchResults.classList.remove('show');
                    return;
                }
                const results = this.dataLoader.searchPlayers(query);
                this.renderTrendsSearchResults(results);
            });
            
            // Click outside to close
            document.addEventListener('click', (e) => {
                if (!trendsSearchInput.contains(e.target) && !trendsSearchResults.contains(e.target)) {
                    trendsSearchResults.classList.remove('show');
                }
            });
        }
        
        // Consistency Scatter filters
        const consistencyPositionFilter = document.getElementById('consistency-position-filter');
        const consistencyShowNames = document.getElementById('consistency-show-names');
        
        if (consistencyPositionFilter) {
            consistencyPositionFilter.addEventListener('change', () => this.renderConsistencyScatterChart());
        }
        if (consistencyShowNames) {
            consistencyShowNames.addEventListener('change', () => this.renderConsistencyScatterChart());
        }
    }

    renderInsights() {
        this.renderValueScatterChart();
        this.renderTrendsChart();
        this.renderConsistencyScatterChart();
    }

    // Chart 1: Value Scatter Plot (ADP vs Projected Rank)
    renderValueScatterChart() {
        const container = document.getElementById('value-scatter-chart');
        if (!container) return;
        
        const positionFilter = document.getElementById('value-position-filter')?.value || '';
        const showNames = document.getElementById('value-show-names')?.checked ?? true;
        
        // Get all players with ADP and projected rank
        const players = this.dataLoader.getAllMasterPlayers()
            .filter(p => p.adp && p.bucket_rank)
            .filter(p => !positionFilter || p.positions.some(pos => pos === positionFilter))
            .map(p => ({
                name: p.name,
                adp: p.adp,
                projRank: p.bucket_rank,
                value: p.adp - p.bucket_rank, // positive = good value
                positions: p.positions,
                tier: p.bucket
            }));
        
        if (players.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data available</div>';
            return;
        }
        
        // Chart dimensions
        const width = 900;
        const height = 600;
        const margin = { top: 20, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const maxADP = Math.max(...players.map(p => p.adp));
        const maxRank = Math.max(...players.map(p => p.projRank));
        const xScale = (adp) => margin.left + (adp / maxADP) * chartWidth;
        const yScale = (rank) => margin.top + ((maxRank - rank) / maxRank) * chartHeight;
        
        // Create SVG
        const svg = `
            <svg width="${width}" height="${height}" class="scatter-chart">
                <!-- Background quadrants -->
                <rect x="${margin.left}" y="${margin.top}" width="${chartWidth/2}" height="${chartHeight/2}" 
                      fill="rgba(34, 197, 94, 0.05)" stroke="none"/>
                <text x="${margin.left + chartWidth/4}" y="${margin.top + 20}" text-anchor="middle" 
                      class="quadrant-label" fill="#22c55e">Steals</text>
                
                <rect x="${margin.left + chartWidth/2}" y="${margin.top + chartHeight/2}" width="${chartWidth/2}" height="${chartHeight/2}" 
                      fill="rgba(239, 68, 68, 0.05)" stroke="none"/>
                <text x="${margin.left + 3*chartWidth/4}" y="${height - margin.bottom - 20}" text-anchor="middle" 
                      class="quadrant-label" fill="#ef4444">Busts</text>
                
                <!-- Grid lines -->
                ${Array.from({length: 5}, (_, i) => {
                    const x = margin.left + (chartWidth / 4) * i;
                    return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" 
                                  stroke="#374151" stroke-width="1" opacity="0.2"/>`;
                }).join('')}
                ${Array.from({length: 5}, (_, i) => {
                    const y = margin.top + (chartHeight / 4) * i;
                    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" 
                                  stroke="#374151" stroke-width="1" opacity="0.2"/>`;
                }).join('')}
                
                <!-- Diagonal "fair value" line -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" 
                      x2="${width - margin.right}" y2="${margin.top}" 
                      stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
                
                <!-- Axes -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" 
                      x2="${width - margin.right}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                <line x1="${margin.left}" y1="${margin.top}" 
                      x2="${margin.left}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                
                <!-- Axis labels -->
                <text x="${width/2}" y="${height - 10}" text-anchor="middle" class="axis-label">ADP (Average Draft Position)</text>
                <text x="20" y="${height/2}" text-anchor="middle" transform="rotate(-90 20 ${height/2})" 
                      class="axis-label">Projected Rank</text>
                
                <!-- Data points -->
                ${players.map(p => {
                    const cx = xScale(p.adp);
                    const cy = yScale(p.projRank);
                    const color = p.value > 10 ? '#22c55e' : p.value < -10 ? '#ef4444' : '#60a5fa';
                    const size = Math.abs(p.value) > 15 ? 8 : 5;
                    
                    return `
                        <circle cx="${cx}" cy="${cy}" r="${size}" fill="${color}" opacity="0.7" 
                                stroke="#fff" stroke-width="1" class="data-point" 
                                data-name="${p.name}" data-adp="${p.adp}" data-rank="${p.projRank}" data-value="${p.value.toFixed(1)}"/>
                        ${showNames && Math.abs(p.value) > 15 ? `
                            <text x="${cx + 10}" y="${cy + 4}" class="point-label" fill="${color}">${p.name}</text>
                        ` : ''}
                    `;
                }).join('')}
            </svg>
            <div class="chart-legend">
                <div class="legend-item"><span class="legend-dot" style="background: #22c55e;"></span> High Value (Proj Rank >> ADP)</div>
                <div class="legend-item"><span class="legend-dot" style="background: #60a5fa;"></span> Fair Value</div>
                <div class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span> Overvalued (ADP >> Proj Rank)</div>
            </div>
        `;
        
        container.innerHTML = svg;
        
        // Add tooltips
        container.querySelectorAll('.data-point').forEach(point => {
            point.addEventListener('mouseenter', (e) => {
                const name = e.target.dataset.name;
                const adp = e.target.dataset.adp;
                const rank = e.target.dataset.rank;
                const value = e.target.dataset.value;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'chart-tooltip';
                tooltip.innerHTML = `
                    <strong>${name}</strong><br/>
                    ADP: ${adp}<br/>
                    Proj Rank: ${rank}<br/>
                    Value: ${value > 0 ? '+' : ''}${value}
                `;
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY - 10 + 'px';
                document.body.appendChild(tooltip);
                e.target._tooltip = tooltip;
            });
            
            point.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    e.target._tooltip.remove();
                }
            });
        });
    }

    renderTrendsSearchResults(results) {
        const container = document.getElementById('trends-search-results');
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-result">No players found</div>';
            container.classList.add('show');
            return;
        }
        
        container.innerHTML = results.slice(0, 10).map(player => `
            <div class="search-result" data-player-id="${player.player_id}">
                <div class="player-name">${player.name}</div>
                <div class="player-meta">${player.positions.join('/')} • ${player.latest_team}</div>
            </div>
        `).join('');
        
        container.classList.add('show');
        
        // Add click handlers
        container.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', (e) => {
                const playerId = e.currentTarget.dataset.playerId;
                this.addPlayerToTrendsChart(playerId);
                container.classList.remove('show');
                document.getElementById('trends-search-input').value = '';
            });
        });
    }

    addPlayerToTrendsChart(playerId) {
        if (this.trendsSelectedPlayers.includes(playerId)) return;
        if (this.trendsSelectedPlayers.length >= 10) {
            alert('Maximum 10 players for comparison');
            return;
        }
        
        this.trendsSelectedPlayers.push(playerId);
        this.renderTrendsSelectedPlayers();
        this.renderTrendsChart();
    }

    removePlayerFromTrendsChart(playerId) {
        this.trendsSelectedPlayers = this.trendsSelectedPlayers.filter(id => id !== playerId);
        this.renderTrendsSelectedPlayers();
        this.renderTrendsChart();
    }

    renderTrendsSelectedPlayers() {
        const container = document.getElementById('trends-selected-players');
        if (!container) return;
        
        if (this.trendsSelectedPlayers.length === 0) {
            container.innerHTML = '<div class="empty-state">Search and select players to compare their rank trajectories</div>';
            return;
        }
        
        container.innerHTML = this.trendsSelectedPlayers.map(playerId => {
            const player = this.dataLoader.getMasterPlayer(playerId);
            return `
                <div class="selected-player-tag">
                    <span>${player.name}</span>
                    <button class="remove-player" data-player-id="${playerId}">×</button>
                </div>
            `;
        }).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                this.removePlayerFromTrendsChart(playerId);
            });
        });
    }

    // Chart 2: Multi-Player Trend Lines
    renderTrendsChart() {
        const container = document.getElementById('trends-chart');
        if (!container) return;
        
        if (this.trendsSelectedPlayers.length === 0) {
            container.innerHTML = '<div class="chart-empty">Select players above to compare their rank trajectories</div>';
            return;
        }
        
        // Get historical data for selected players
        const playersData = this.trendsSelectedPlayers.map(playerId => {
            const historical = this.dataLoader.getHistoricalAnalysis({ playerId })[0];
            return historical ? {
                ...historical,
                playerId
            } : null;
        }).filter(p => p);
        
        if (playersData.length === 0) {
            container.innerHTML = '<div class="chart-empty">No historical data available for selected players</div>';
            return;
        }
        
        // Chart dimensions
        const width = 900;
        const height = 500;
        const margin = { top: 20, right: 150, bottom: 60, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Get all seasons and max rank
        const allSeasons = [...new Set(playersData.flatMap(p => p.seasonRanks.map(s => s.season)))].sort();
        const maxRank = Math.max(...playersData.flatMap(p => p.seasonRanks.map(s => s.rank)));
        
        // Scales
        const xScale = (seasonIndex) => margin.left + (seasonIndex / (allSeasons.length - 1)) * chartWidth;
        const yScale = (rank) => margin.top + ((maxRank - rank) / maxRank) * chartHeight;
        
        // Colors for different players
        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
        
        // Create SVG
        const svg = `
            <svg width="${width}" height="${height}" class="line-chart">
                <!-- Grid lines -->
                ${allSeasons.map((season, i) => `
                    <line x1="${xScale(i)}" y1="${margin.top}" x2="${xScale(i)}" y2="${height - margin.bottom}" 
                          stroke="#374151" stroke-width="1" opacity="0.2"/>
                `).join('')}
                ${Array.from({length: 6}, (_, i) => {
                    const y = margin.top + (chartHeight / 5) * i;
                    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" 
                                  stroke="#374151" stroke-width="1" opacity="0.2"/>`;
                }).join('')}
                
                <!-- Axes -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" 
                      x2="${width - margin.right}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                <line x1="${margin.left}" y1="${margin.top}" 
                      x2="${margin.left}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                
                <!-- X-axis labels (seasons) -->
                ${allSeasons.map((season, i) => `
                    <text x="${xScale(i)}" y="${height - margin.bottom + 20}" text-anchor="middle" 
                          class="axis-label">${season.split('-')[0].slice(2)}</text>
                `).join('')}
                
                <!-- Y-axis labels (ranks) -->
                ${Array.from({length: 6}, (_, i) => {
                    const rank = Math.round(maxRank - (maxRank / 5) * i);
                    const y = margin.top + (chartHeight / 5) * i;
                    return `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" class="axis-label">${rank}</text>`;
                }).join('')}
                
                <!-- Axis titles -->
                <text x="${width/2}" y="${height - 10}" text-anchor="middle" class="axis-label">Season</text>
                <text x="20" y="${height/2}" text-anchor="middle" transform="rotate(-90 20 ${height/2})" 
                      class="axis-label">Rank (Lower is Better)</text>
                
                <!-- Lines and points for each player -->
                ${playersData.map((player, playerIndex) => {
                    const color = colors[playerIndex % colors.length];
                    const points = player.seasonRanks
                        .filter(s => allSeasons.includes(s.season))
                        .map(s => ({
                            x: xScale(allSeasons.indexOf(s.season)),
                            y: yScale(s.rank),
                            rank: s.rank,
                            season: s.season
                        }));
                    
                    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    
                    return `
                        <path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.8"/>
                        ${points.map(p => `
                            <circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" stroke="#1f2937" stroke-width="2" 
                                    class="data-point" data-name="${player.name}" data-season="${p.season}" data-rank="${p.rank}"/>
                        `).join('')}
                        <text x="${width - margin.right + 10}" y="${points[points.length - 1]?.y || margin.top + playerIndex * 20}" 
                              class="legend-label" fill="${color}">${player.name}</text>
                    `;
                }).join('')}
            </svg>
        `;
        
        container.innerHTML = svg;
        
        // Add tooltips
        container.querySelectorAll('.data-point').forEach(point => {
            point.addEventListener('mouseenter', (e) => {
                const name = e.target.dataset.name;
                const season = e.target.dataset.season;
                const rank = e.target.dataset.rank;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'chart-tooltip';
                tooltip.innerHTML = `<strong>${name}</strong><br/>${season}: Rank ${rank}`;
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY - 10 + 'px';
                document.body.appendChild(tooltip);
                e.target._tooltip = tooltip;
            });
            
            point.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    e.target._tooltip.remove();
                }
            });
        });
    }

    // Chart 3: Consistency vs Performance Scatter
    renderConsistencyScatterChart() {
        const container = document.getElementById('consistency-scatter-chart');
        if (!container) return;
        
        const positionFilter = document.getElementById('consistency-position-filter')?.value || '';
        const showNames = document.getElementById('consistency-show-names')?.checked ?? true;
        
        // Get historical analysis data
        const players = this.dataLoader.getHistoricalAnalysis({ 
            minSeasons: 2,
            minGames: 20 
        })
            .filter(p => !positionFilter || p.positions.some(pos => pos === positionFilter))
            .map(p => ({
                name: p.name,
                avgRank: p.avgRank,
                consistency: p.consistency,
                category: p.category,
                positions: p.positions
            }));
        
        if (players.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data available</div>';
            return;
        }
        
        // Chart dimensions
        const width = 900;
        const height = 600;
        const margin = { top: 20, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const maxRank = Math.max(...players.map(p => p.avgRank));
        const maxConsistency = Math.max(...players.map(p => p.consistency));
        const xScale = (rank) => margin.left + (rank / maxRank) * chartWidth;
        const yScale = (consistency) => height - margin.bottom - (consistency / maxConsistency) * chartHeight;
        
        // Create SVG
        const svg = `
            <svg width="${width}" height="${height}" class="scatter-chart">
                <!-- Background quadrants -->
                <rect x="${margin.left + chartWidth/2}" y="${margin.top}" width="${chartWidth/2}" height="${chartHeight/2}" 
                      fill="rgba(34, 197, 94, 0.05)" stroke="none"/>
                <text x="${margin.left + 3*chartWidth/4}" y="${margin.top + 20}" text-anchor="middle" 
                      class="quadrant-label" fill="#22c55e">Safe Picks</text>
                
                <rect x="${margin.left}" y="${margin.top}" width="${chartWidth/2}" height="${chartHeight/2}" 
                      fill="rgba(251, 146, 60, 0.05)" stroke="none"/>
                <text x="${margin.left + chartWidth/4}" y="${margin.top + 20}" text-anchor="middle" 
                      class="quadrant-label" fill="#fb923c">Risky Studs</text>
                
                <!-- Grid lines -->
                ${Array.from({length: 5}, (_, i) => {
                    const x = margin.left + (chartWidth / 4) * i;
                    return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" 
                                  stroke="#374151" stroke-width="1" opacity="0.2"/>`;
                }).join('')}
                ${Array.from({length: 5}, (_, i) => {
                    const y = margin.top + (chartHeight / 4) * i;
                    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" 
                                  stroke="#374151" stroke-width="1" opacity="0.2"/>`;
                }).join('')}
                
                <!-- Median lines -->
                <line x1="${margin.left + chartWidth/2}" y1="${margin.top}" 
                      x2="${margin.left + chartWidth/2}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
                <line x1="${margin.left}" y1="${height - margin.bottom - chartHeight/2}" 
                      x2="${width - margin.right}" y2="${height - margin.bottom - chartHeight/2}" 
                      stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"/>
                
                <!-- Axes -->
                <line x1="${margin.left}" y1="${height - margin.bottom}" 
                      x2="${width - margin.right}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                <line x1="${margin.left}" y1="${margin.top}" 
                      x2="${margin.left}" y2="${height - margin.bottom}" 
                      stroke="#9ca3af" stroke-width="2"/>
                
                <!-- Axis labels -->
                <text x="${width/2}" y="${height - 10}" text-anchor="middle" class="axis-label">Average Rank (Lower is Better)</text>
                <text x="20" y="${height/2}" text-anchor="middle" transform="rotate(-90 20 ${height/2})" 
                      class="axis-label">Consistency Score (Higher is More Consistent)</text>
                
                <!-- Data points -->
                ${players.map(p => {
                    const cx = xScale(p.avgRank);
                    const cy = yScale(p.consistency);
                    const color = p.avgRank < 50 && p.consistency > maxConsistency/2 ? '#22c55e' : 
                                  p.avgRank < 50 ? '#fb923c' : '#60a5fa';
                    const size = p.avgRank < 30 ? 7 : 5;
                    
                    return `
                        <circle cx="${cx}" cy="${cy}" r="${size}" fill="${color}" opacity="0.7" 
                                stroke="#fff" stroke-width="1" class="data-point" 
                                data-name="${p.name}" data-rank="${p.avgRank.toFixed(1)}" data-consistency="${p.consistency.toFixed(2)}"/>
                        ${showNames && p.avgRank < 30 ? `
                            <text x="${cx + 10}" y="${cy + 4}" class="point-label" fill="${color}">${p.name}</text>
                        ` : ''}
                    `;
                }).join('')}
            </svg>
            <div class="chart-legend">
                <div class="legend-item"><span class="legend-dot" style="background: #22c55e;"></span> Safe High Performers</div>
                <div class="legend-item"><span class="legend-dot" style="background: #fb923c;"></span> Risky Elites</div>
                <div class="legend-item"><span class="legend-dot" style="background: #60a5fa;"></span> Mid-Tier Options</div>
            </div>
        `;
        
        container.innerHTML = svg;
        
        // Add tooltips
        container.querySelectorAll('.data-point').forEach(point => {
            point.addEventListener('mouseenter', (e) => {
                const name = e.target.dataset.name;
                const rank = e.target.dataset.rank;
                const consistency = e.target.dataset.consistency;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'chart-tooltip';
                tooltip.innerHTML = `
                    <strong>${name}</strong><br/>
                    Avg Rank: ${rank}<br/>
                    Consistency: ${consistency}
                `;
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY - 10 + 'px';
                document.body.appendChild(tooltip);
                e.target._tooltip = tooltip;
            });
            
            point.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    e.target._tooltip.remove();
                }
            });
        });
    }

    showError(message) {
        // Simple error display - could be enhanced
        alert(message);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MoneballApp();
});
