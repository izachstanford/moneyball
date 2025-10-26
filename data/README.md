# Data Directory

This directory contains all the data files used by the Moneyball Roto Analytics app.

## Files

### Source Data Files

1. **fantasy_roto_dashboard.json**
   - Historical player statistics across multiple seasons
   - Contains per-game and total stats for all categories (PTS, REB, AST, STL, BLK, 3PM, FG%, FT%, TOV)
   - Includes player metadata (team, positions, age, games played)
   - Source: Historical NBA fantasy data

2. **yahoo_adp.json**
   - Average Draft Position (ADP) data from Yahoo Fantasy
   - Updated: October 8, 2025
   - Includes rookie flags
   - Maps player_id to ADP value

3. **dans_buckets.json**
   - Player rankings and buckets by Dan
   - Includes player_id, bucket tier, rank, and flags
   - 165 players matched with player_ids
   - 3 unmatched (college prospects): Ace Bailey, VJ Edgecombe, Dylan Harper

### Generated Master Files

4. **players.json** (Auto-generated)
   - Master player registry consolidating all data sources
   - 638 total players
   - Each player has a unique player_id
   - Structure:
     ```json
     {
       "meta": {
         "last_updated": "ISO timestamp",
         "total_players": 638,
         "description": "..."
       },
       "players": {
         "player_id": {
           "player_id": "string",
           "name": "string",
           "team": "string",
           "positions": ["array"],
           "adp": "number (optional)",
           "rookie": "boolean (optional)",
           "bucket": "string (optional)",
           "bucket_rank": "number (optional)",
           "flags": ["array (optional)"]
         }
       }
     }
     ```

## Usage

The app loads all data files asynchronously on startup through `src/utils/dataLoader.js`.

To regenerate master files, run from project root:
```bash
node -e "const script = require('path/to/regenerate/script')"
```

## Data Flow

```
fantasy_roto_dashboard.json ─┐
yahoo_adp.json              ├─> combineData() ─> Combined Player Data
dans_buckets.json           ─┘                   + players.json (master registry)
```

