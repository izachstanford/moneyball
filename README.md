# Moneyball - Roto Analytics

A fast, opinionated web app for fantasy basketball rotisserie analytics. Find breakout targets, underrated values, and make draft-ready decisions with historical performance trends.

## Features

### 🎯 Draft Board (Default Tab)
- Yahoo-style dark, sleek interface
- Sortable columns for all key metrics
- Projected ranks and value vs ADP
- Historical rank consistency and trends
- Tier-based groupings (1-5)
- Live team category tracking
- Position filtering and draft management

### 📈 Trends (Historical Analysis)
- Player categorization (Elite & Consistent, Rising Stars, Breakout Candidates, etc.)
- Multi-season rank visualization with sparkline charts
- Consistency scores based on rank volatility
- Position and category filtering
- Multi-select player search
- Year-over-year performance tracking

### 📊 Breakouts
- Identify rising players via rank trajectory
- Undervalued targets (ADP vs performance)
- Breakout candidates with scoring algorithm
- Age curve and usage trend analysis
- Filter by breakout category

## Data Sources

The app uses three static JSON files located in the `data/` folder for instant performance:

- `fantasy_roto_dashboard.json` - Historical roto data (2022-2025 seasons)
- `yahoo_adp.json` - Latest ADP data with rookie flags
- `dans_buckets.json` - Projected player tiers and rankings
- `players.json` - Master player registry combining all data sources

### Updating Data for Future Seasons

**Historical Roto Data** (`fantasy_roto_dashboard.json`):
- Source: [Basketball Reference - Player Stats](https://www.basketball-reference.com/leagues/NBA_2022_totals.html)
- Update the year in the URL (e.g., `NBA_2023_totals.html` for 2022-23 season)
- Export season data including totals, per-game averages, and advanced stats
- Calculate Z-scores and roto ranks for each player

**Projected Tiers & Rankings** (`dans_buckets.json`):
- Source: [Dan's Fantasy Basketball Projections](https://docs.google.com/spreadsheets/d/12sHhQrIJdpkuC4nhnA3wyLUKuXD3ZmqUld_S03ddItM/edit?gid=2056635188#gid=2056635188)
- Export projected rankings and tier assignments
- Match players by `player_id` to ensure consistency

**ADP Data** (`yahoo_adp.json`):
- Source: Yahoo Fantasy Basketball (or other ADP sources)
- Update with latest pre-season average draft position data
- Mark rookies appropriately

## Analytics Intelligence

- **Roto Ranks**: Primary analytic signal from historical data
- **Value vs ADP**: Rank deltas identifying over/under-performers  
- **Breakout Algorithm**: Combines trend slope, role uptick, age curve, late-season surge
- **Tiering**: Automatic tier breaks based on score gaps
- **Stability Metrics**: Games played and consistency tracking

## Quick Start

### Option 1: Simple HTTP Server (Recommended)
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have it)
npx serve .
```

Then open `http://localhost:8000`

### Option 2: Vite Development Server
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Opens at `http://localhost:3000`

### Option 3: Build for Production
```bash
npm run build
npm run preview
```

## Project Structure

```
moneyball/
├── index.html                 # Main app entry point
├── src/
│   ├── main.js               # Application logic
│   ├── utils/
│   │   └── dataLoader.js     # Data processing utilities
│   └── styles/
│       └── main.css          # Dark theme styling
├── data/
│   ├── fantasy_roto_dashboard.json  # Historical player data
│   ├── yahoo_adp.json              # Current ADP data
│   ├── dans_buckets.json           # Projected tiers & rankings
│   ├── players.json                # Master player registry
│   └── README.md                   # Data folder documentation
└── package.json                # Build configuration
```

## Data Schema

### Historical Data (`fantasy_roto_dashboard.json`)
```javascript
{
  "players": {
    "PlayerName": {
      "player_id": "unique_id",
      "latest_team": "TEAM",
      "positions": ["PG", "SG"],
      "seasons": {
        "2024-2025": {
          "meta": { "games_played": 76, "age": 26 },
          "totals": { "PTS": 2484, "REB": 379, ... },
          "averages": { "PTS_G": 32.7, "REB_G": 5.0, ... },
          "zscores": { "Z_PTS_G": 3.49, ... },
          "ranks": { "per_game_rank": 1, "total_rank": 1 }
        }
      }
    }
  }
}
```

### ADP Data (`yahoo_adp.json`)
```javascript
{
  "player_id": {
    "player": "Player Name",
    "adp": 12.5,
    "adp_date": "2025-10-08",
    "rookie": false
  }
}
```

## Core Categories (9-Cat Roto)

- **PTS** - Points
- **REB** - Rebounds  
- **AST** - Assists
- **STL** - Steals
- **BLK** - Blocks
- **3PM** - Three-Pointers Made
- **FG%** - Field Goal Percentage
- **FT%** - Free Throw Percentage
- **TOV** - Turnovers (lower is better)

## Performance Notes

- **Static Data**: No network calls after initial load
- **Instant Filtering**: All operations run client-side
- **Optimized Rendering**: Virtual scrolling for large tables
- **Mobile Responsive**: Adaptive layout for smaller screens

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features required
- No IE support

## Development

Built with vanilla JavaScript for maximum performance and minimal dependencies. The dark theme uses CSS custom properties for easy customization.

### Key Design Principles

1. **Speed First**: Static data, minimal DOM manipulation
2. **Information Dense**: Yahoo draft room inspiration
3. **Analytics Focused**: Roto ranks as primary signal
4. **Draft Ready**: Immediate actionable insights

---

*Built for serious fantasy basketball players who value data-driven decisions.*
