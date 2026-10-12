# Word Orb Notion Integration

## Setup
```bash
npm install
export NOTION_TOKEN=ntn_your_token
export WORDORB_API_KEY=wo_your_key
```

## Create a Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Create new integration: "Word Orb Vocabulary"
3. Copy the Internal Integration Token
4. Share your target Notion page with the integration

## Usage
```bash
# Create a vocabulary database
node notion-integration.js create-db <parent-page-id>

# Add a word to the database
node notion-integration.js add-word <database-id> courage

# Create a daily word page
node notion-integration.js daily <parent-page-id> resilience
```

## Notion Integration Directory
1. Go to https://www.notion.so/integrations
2. Publish as a public integration
3. Fill in:
   - Name: Word Orb Vocabulary
   - Category: Education
   - Description: Build vocabulary databases with 162K+ curated word definitions
4. Submit for review

## Features
- Creates structured vocabulary databases with definition, IPA, etymology, audio
- Daily word pages with full lesson content (5 phases)
- Translations in 47 languages
- Checkbox tracking for mastered words
