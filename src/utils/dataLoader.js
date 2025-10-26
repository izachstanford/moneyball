// Data loading and processing utilities
class DataLoader {
    constructor() {
        this.playerData = null;
        this.adpData = null;
        this.bucketsData = null;
        this.masterData = null;
        this.combinedData = null;
        this.categories = ['PTS', 'REB', 'AST', 'STL', 'BLK', '3PM', 'FG%', 'FT%', 'TOV'];
    }

    async loadData() {
        try {
            const [playerResponse, adpResponse, bucketsResponse, masterResponse] = await Promise.all([
                fetch('./data/fantasy_roto_dashboard.json'),
                fetch('./data/yahoo_adp.json'),
                fetch('./data/dans_buckets.json'),
                fetch('./data/players.json')
            ]);

            this.playerData = await playerResponse.json();
            this.adpData = await adpResponse.json();
            this.bucketsData = await bucketsResponse.json();
            this.masterData = await masterResponse.json();
            
            this.combinedData = this.combineData();
            return this.combinedData;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    combineData() {
        const combined = {};
        
        // Use master players.json as the source of truth
        // It already has everything consolidated
        if (this.masterData && this.masterData.players) {
            Object.entries(this.masterData.players).forEach(([playerId, masterPlayer]) => {
                // Get historical seasons data if available
                let seasons = {};
                let latest_team = masterPlayer.team;
                let positions = masterPlayer.positions;
                
                // Look up player in historical data by player_id
                const historicalPlayer = Object.values(this.playerData.players || {}).find(
                    p => p.player_id === playerId
                );
                
                if (historicalPlayer) {
                    seasons = historicalPlayer.seasons || {};
                    latest_team = historicalPlayer.latest_team || masterPlayer.team;
                    positions = historicalPlayer.positions || masterPlayer.positions;
                }
                
                combined[playerId] = {
                    name: masterPlayer.name,
                    player_id: playerId,
                    latest_team: latest_team,
                    positions: positions,
                    seasons: seasons,
                    adp: masterPlayer.adp ? {
                        value: masterPlayer.adp,
                        date: this.adpData[playerId]?.adp_date || null,
                        rookie: masterPlayer.rookie || false
                    } : null,
                    bucket: masterPlayer.bucket ? {
                        bucket: masterPlayer.bucket,
                        rank: masterPlayer.bucket_rank,
                        flags: masterPlayer.flags || []
                    } : null
                };
            });
        }

        return combined;
    }

    getPlayerList() {
        if (!this.combinedData) return [];
        
        return Object.values(this.combinedData).map(player => ({
            player_id: player.player_id,
            name: player.name,
            team: player.latest_team,
            positions: player.positions,
            adp: player.adp?.value || null,
            rookie: player.adp?.rookie || false,
            seasons: Object.keys(player.seasons || {})
        })).sort((a, b) => {
            if (a.adp && b.adp) return a.adp - b.adp;
            if (a.adp && !b.adp) return -1;
            if (!a.adp && b.adp) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    getPlayer(playerId) {
        return this.combinedData?.[playerId] || null;
    }

    getSeasonData(playerId, season) {
        const player = this.getPlayer(playerId);
        return player?.seasons?.[season] || null;
    }

    getLatestSeasonData(playerId) {
        const player = this.getPlayer(playerId);
        if (!player?.seasons) return null;
        
        const seasons = Object.keys(player.seasons).sort().reverse();
        return seasons.length > 0 ? player.seasons[seasons[0]] : null;
    }

    calculateTrends(playerId) {
        const player = this.getPlayer(playerId);
        if (!player?.seasons) return null;

        const seasons = Object.keys(player.seasons).sort();
        if (seasons.length < 2) return null;

        const trends = {};
        const firstSeason = player.seasons[seasons[0]];
        const lastSeason = player.seasons[seasons[seasons.length - 1]];
        
        // Calculate rank trend
        if (firstSeason.ranks && lastSeason.ranks) {
            const firstRank = firstSeason.ranks.per_game_rank || firstSeason.ranks.total_rank;
            const lastRank = lastSeason.ranks.per_game_rank || lastSeason.ranks.total_rank;
            
            if (firstRank && lastRank) {
                trends.rankChange = firstRank - lastRank; // Positive means improvement (lower rank number)
                trends.rankSlope = trends.rankChange / (seasons.length - 1);
            }
        }

        // Calculate category trends
        this.categories.forEach(cat => {
            const values = seasons.map(season => {
                const data = player.seasons[season];
                if (cat === 'FG%') return data.averages?.FG_PCT;
                if (cat === 'FT%') return data.averages?.FT_PCT;
                if (cat === '3PM') return data.averages?.['3PM_G'];
                if (cat === 'TOV') return data.averages?.TOV_G;
                return data.averages?.[`${cat}_G`];
            }).filter(v => v !== undefined);

            if (values.length >= 2) {
                const slope = this.calculateSlope(values);
                trends[`${cat}_trend`] = slope;
            }
        });

        return trends;
    }

    calculateSlope(values) {
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + (x * y), 0);
        const sumXX = values.reduce((sum, _, x) => sum + (x * x), 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    calculateValueVsADP(playerId) {
        const player = this.getPlayer(playerId);
        if (!player?.adp?.value) return null;

        const latestSeason = this.getLatestSeasonData(playerId);
        if (!latestSeason?.ranks) return null;

        const adp = player.adp.value;
        const rotoRank = latestSeason.ranks.per_game_rank || latestSeason.ranks.total_rank;
        
        if (!rotoRank) return null;

        return {
            adp,
            rotoRank,
            value: adp - rotoRank, // Positive means outperforming ADP
            percentage: ((adp - rotoRank) / adp) * 100
        };
    }

    getBreakoutCandidates() {
        const candidates = [];
        
        Object.keys(this.combinedData).forEach(playerId => {
            const player = this.getPlayer(playerId);
            const trends = this.calculateTrends(playerId);
            const value = this.calculateValueVsADP(playerId);
            const latestSeason = this.getLatestSeasonData(playerId);
            
            if (!trends || !latestSeason) return;

            let breakoutScore = 0;
            let reasons = [];

            // Positive rank trend (improving)
            if (trends.rankChange > 0) {
                breakoutScore += Math.min(trends.rankChange / 10, 3);
                reasons.push(`Rank improved by ${Math.round(trends.rankChange)} spots`);
            }

            // Age curve (players 22-26 getting better)
            const age = latestSeason.meta?.age;
            if (age && age >= 22 && age <= 26) {
                breakoutScore += 2;
                reasons.push(`Prime age (${age})`);
            }

            // Increased minutes/games
            const seasons = Object.keys(player.seasons).sort();
            if (seasons.length >= 2) {
                const prevSeason = player.seasons[seasons[seasons.length - 2]];
                const currGames = latestSeason.meta?.games_played || 0;
                const prevGames = prevSeason.meta?.games_played || 0;
                
                if (currGames > prevGames + 10) {
                    breakoutScore += 2;
                    reasons.push(`Games played increased by ${currGames - prevGames}`);
                }
            }

            // Undervalued by ADP
            if (value && value.value > 20) {
                breakoutScore += 3;
                reasons.push(`Outperformed ADP by ${Math.round(value.value)} spots`);
            }

            if (breakoutScore >= 4) {
                candidates.push({
                    playerId,
                    player,
                    breakoutScore,
                    reasons,
                    trends,
                    value
                });
            }
        });

        return candidates.sort((a, b) => b.breakoutScore - a.breakoutScore);
    }

    getUndervaluedPlayers() {
        const undervalued = [];
        
        Object.keys(this.combinedData).forEach(playerId => {
            const value = this.calculateValueVsADP(playerId);
            const player = this.getPlayer(playerId);
            
            if (value && value.value > 15) { // Outperformed ADP by 15+ spots
                undervalued.push({
                    playerId,
                    player,
                    value,
                    trends: this.calculateTrends(playerId)
                });
            }
        });

        return undervalued.sort((a, b) => b.value.value - a.value.value);
    }

    getLeaderboard(options = {}) {
        const {
            season = null,
            position = null,
            minGames = 0,
            rankType = 'per_game'
        } = options;

        const players = [];

        Object.keys(this.combinedData).forEach(playerId => {
            const player = this.getPlayer(playerId);
            
            if (season) {
                const seasonData = this.getSeasonData(playerId, season);
                if (!seasonData) return;
                
                const games = seasonData.meta?.games_played || 0;
                if (games < minGames) return;
                
                if (position && !player.positions.includes(position)) return;
                
                const rank = rankType === 'per_game' ? 
                    seasonData.ranks?.per_game_rank : 
                    seasonData.ranks?.total_rank;
                    
                if (!rank) return;
                
                players.push({
                    playerId,
                    player,
                    seasonData,
                    rank,
                    season
                });
            } else {
                // Multi-season aggregate
                const seasons = Object.keys(player.seasons);
                if (seasons.length === 0) return;
                
                if (position && !player.positions.includes(position)) return;
                
                // Use latest season for filtering and ranking
                const latestSeason = seasons.sort().reverse()[0];
                const seasonData = player.seasons[latestSeason];
                
                const games = seasonData.meta?.games_played || 0;
                if (games < minGames) return;
                
                const rank = rankType === 'per_game' ? 
                    seasonData.ranks?.per_game_rank : 
                    seasonData.ranks?.total_rank;
                    
                if (!rank) return;
                
                players.push({
                    playerId,
                    player,
                    seasonData,
                    rank,
                    season: latestSeason
                });
            }
        });

        return players.sort((a, b) => a.rank - b.rank);
    }

    searchPlayers(query) {
        if (!query || query.length < 2) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.getPlayerList().filter(player => 
            player.name.toLowerCase().includes(lowerQuery) ||
            player.team.toLowerCase().includes(lowerQuery) ||
            player.positions.some(pos => pos.toLowerCase().includes(lowerQuery))
        ).slice(0, 10);
    }

    // Get player info from master data for quick lookups
    getMasterPlayer(playerId) {
        return this.masterData?.players?.[playerId] || null;
    }

    // Get all players from master data
    getAllMasterPlayers() {
        return this.masterData?.players || {};
    }

    getTeamStats(draftedPlayerIds) {
        const stats = {
            PTS: 0, REB: 0, AST: 0, STL: 0, BLK: 0, '3PM': 0,
            FG_ATTEMPTS: 0, FG_MAKES: 0, FT_ATTEMPTS: 0, FT_MAKES: 0, TOV: 0
        };
        
        let playerCount = 0;
        
        draftedPlayerIds.forEach(playerId => {
            const latestSeason = this.getLatestSeasonData(playerId);
            if (!latestSeason?.averages) return;
            
            const avg = latestSeason.averages;
            stats.PTS += avg.PTS_G || 0;
            stats.REB += avg.REB_G || 0;
            stats.AST += avg.AST_G || 0;
            stats.STL += avg.STL_G || 0;
            stats.BLK += avg.BLK_G || 0;
            stats['3PM'] += avg['3PM_G'] || 0;
            stats.TOV += avg.TOV_G || 0;
            
            // For percentages, track attempts and makes
            if (latestSeason.totals) {
                stats.FG_ATTEMPTS += latestSeason.totals.FGA || 0;
                stats.FG_MAKES += latestSeason.totals.FG || 0;
                stats.FT_ATTEMPTS += latestSeason.totals.FTA || 0;
                stats.FT_MAKES += latestSeason.totals.FT || 0;
            }
            
            playerCount++;
        });
        
        // Calculate percentages
        stats['FG%'] = stats.FG_ATTEMPTS > 0 ? stats.FG_MAKES / stats.FG_ATTEMPTS : 0;
        stats['FT%'] = stats.FT_ATTEMPTS > 0 ? stats.FT_MAKES / stats.FT_ATTEMPTS : 0;
        
        return { stats, playerCount };
    }

    getRankTier(rank) {
        if (rank <= 24) return 'tier-1';
        if (rank <= 60) return 'tier-2';
        if (rank <= 120) return 'tier-3';
        return '';
    }

    formatValue(value, category) {
        if (typeof value !== 'number') return '-';
        
        if (category === 'FG%' || category === 'FT%') {
            return (value * 100).toFixed(1) + '%';
        }
        
        return value.toFixed(1);
    }

    getSeasonDisplayName(season) {
        const [start, end] = season.split('-');
        return `${start.slice(2)}-${end.slice(2)}`;
    }

    // Historical Analysis Methods
    getHistoricalAnalysis(options = {}) {
        const {
            position = null,
            minSeasons = 2,
            minGamesPerSeason = 20,
            rankType = 'per_game',
            category = null
        } = options;

        const players = [];

        Object.keys(this.combinedData).forEach(playerId => {
            const player = this.getPlayer(playerId);
            const seasons = Object.keys(player.seasons || {}).sort();
            
            // Filter by minimum seasons
            if (seasons.length < minSeasons) return;
            
            // Filter by position
            if (position && !player.positions.includes(position)) return;
            
            // Collect season data that meets minimum games
            const validSeasonData = [];
            const seasonRanks = [];
            
            seasons.forEach(season => {
                const seasonData = player.seasons[season];
                const games = seasonData.meta?.games_played || 0;
                
                if (games < minGamesPerSeason) return;
                
                const rank = rankType === 'per_game' ? 
                    seasonData.ranks?.per_game_rank : 
                    seasonData.ranks?.total_rank;
                
                if (!rank) return;
                
                validSeasonData.push({
                    season,
                    rank,
                    games,
                    age: seasonData.meta?.age
                });
                
                seasonRanks.push(rank);
            });
            
            // Need at least minSeasons of valid data
            if (validSeasonData.length < minSeasons) return;
            
            // Calculate metrics
            const avgRank = seasonRanks.reduce((a, b) => a + b, 0) / seasonRanks.length;
            const consistency = this.calculateStandardDeviation(seasonRanks);
            const bestRank = Math.min(...seasonRanks);
            const worstRank = Math.max(...seasonRanks);
            const rankRange = worstRank - bestRank;
            
            // Calculate trend (improving or declining) - positive = improving
            const rankTrend = validSeasonData.length > 1 ? 
                validSeasonData[0].rank - validSeasonData[validSeasonData.length - 1].rank : 0;
            
            // Get latest age
            const latestAge = validSeasonData[validSeasonData.length - 1]?.age || null;
            
            // Categorize player
            const playerCategory = this.categorizePlayer({
                avgRank,
                consistency,
                rankTrend,
                bestRank,
                worstRank,
                rankRange,
                age: latestAge,
                seasonsAnalyzed: validSeasonData.length
            });
            
            const playerData = {
                playerId,
                player,
                avgRank,
                consistency,
                bestRank,
                worstRank,
                rankRange,
                rankTrend,
                seasonsAnalyzed: validSeasonData.length,
                validSeasonData,
                category: playerCategory,
                age: latestAge
            };
            
            // Filter by category if specified
            if (!category || playerCategory === category) {
                players.push(playerData);
            }
        });

        // Sort by average rank
        return players.sort((a, b) => a.avgRank - b.avgRank);
    }

    categorizePlayer(metrics) {
        const { avgRank, consistency, rankTrend, bestRank, rankRange, age, seasonsAnalyzed } = metrics;
        
        // Elite & Consistent: Top 30 average rank with low volatility
        if (avgRank <= 30 && consistency < 15) {
            return 'elite-consistent';
        }
        
        // Rising Stars: Significant positive trend (improving by 15+ ranks)
        if (rankTrend > 15 && avgRank <= 80) {
            return 'rising-stars';
        }
        
        // Breakout Candidates: Good recent performance + young age + positive trend
        if (rankTrend > 0 && age && age <= 26 && bestRank <= 60) {
            return 'breakout-candidates';
        }
        
        // Declining: Negative trend (worsening by 15+ ranks)
        if (rankTrend < -15) {
            return 'declining';
        }
        
        // Volatile: High consistency score (unpredictable)
        if (consistency > 50) {
            return 'volatile';
        }
        
        // Reliable Producers: Everything else in top 100 with decent consistency
        if (avgRank <= 100 && consistency < 30) {
            return 'reliable-producers';
        }
        
        return 'reliable-producers';
    }

    getCategoryInfo() {
        return {
            'elite-consistent': {
                title: 'Elite & Consistent',
                description: 'Top-tier players (avg rank ≤30) with low volatility. Your safest high-end picks.',
                color: '#00c851',
                icon: '⭐'
            },
            'rising-stars': {
                title: 'Rising Stars',
                description: 'Players improving significantly (15+ rank improvement). Strong upward trajectory.',
                color: '#0066cc',
                icon: '📈'
            },
            'breakout-candidates': {
                title: 'Breakout Candidates',
                description: 'Young players (≤26) showing positive trends. High upside potential.',
                color: '#ff8800',
                icon: '🚀'
            },
            'reliable-producers': {
                title: 'Reliable Producers',
                description: 'Solid performers (avg rank ≤100) with consistent output. Safe mid-round picks.',
                color: '#17a2b8',
                icon: '✓'
            },
            'declining': {
                title: 'Declining',
                description: 'Players trending downward (15+ rank drop). Approach with caution.',
                color: '#ff4444',
                icon: '📉'
            },
            'volatile': {
                title: 'Volatile',
                description: 'Inconsistent performers with high variance. Risk/reward plays.',
                color: '#ffc107',
                icon: '⚠️'
            }
        };
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        
        return Math.sqrt(avgSquareDiff);
    }

    getConsistencyRating(stdDev) {
        // Lower standard deviation = more consistent
        if (stdDev < 10) return 'Elite';
        if (stdDev < 20) return 'Very Good';
        if (stdDev < 30) return 'Good';
        if (stdDev < 50) return 'Average';
        return 'Volatile';
    }
}

// Export for use in main.js
window.DataLoader = DataLoader;
