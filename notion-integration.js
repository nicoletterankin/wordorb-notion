/**
 * WordOrb Notion Integration
 * Creates vocabulary databases and daily word pages in Notion
 *
 * Run: NOTION_TOKEN=ntn_xxx WORDORB_API_KEY=wo_xxx node notion-integration.js
 */

const { Client } = require('@notionhq/client');

const WORDORB_API = 'https://wordorb.ai/api';

class WordOrbNotion {
  constructor(notionToken, wordorbApiKey) {
    this.notion = new Client({ auth: notionToken });
    this.apiKey = wordorbApiKey;
  }

  async apiGet(path) {
    const res = await fetch(`${WORDORB_API}${path}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error(`WordOrb API error: ${res.status}`);
    return res.json();
  }

  // Create a vocabulary database in a parent page
  async createVocabularyDatabase(parentPageId) {
    return this.notion.databases.create({
      parent: { page_id: parentPageId },
      title: [{ text: { content: 'WordOrb Vocabulary' } }],
      properties: {
        'Word': { title: {} },
        'Definition': { rich_text: {} },
        'Part of Speech': {
          select: {
            options: [
              { name: 'noun', color: 'blue' },
              { name: 'verb', color: 'red' },
              { name: 'adjective', color: 'green' },
              { name: 'adverb', color: 'purple' },
              { name: 'preposition', color: 'yellow' },
              { name: 'conjunction', color: 'orange' },
            ]
          }
        },
        'IPA': { rich_text: {} },
        'Etymology': { rich_text: {} },
        'Audio': { url: {} },
        'Date Added': { date: {} },
        'Mastered': { checkbox: {} },
      }
    });
  }

  // Add a word to the vocabulary database
  async addWord(databaseId, word) {
    const data = await this.apiGet(`/word/${encodeURIComponent(word)}?tone=adult&translate=es,fr,ja`);

    const properties = {
      'Word': { title: [{ text: { content: data.word || word } }] },
      'Definition': { rich_text: [{ text: { content: (data.definition || data.def || '').slice(0, 2000) } }] },
      'Part of Speech': { select: { name: data.part_of_speech || data.pos || 'noun' } },
      'IPA': { rich_text: [{ text: { content: data.ipa || '' } }] },
      'Etymology': { rich_text: [{ text: { content: (data.etymology || data.etym || '').slice(0, 2000) } }] },
      'Date Added': { date: { start: new Date().toISOString().split('T')[0] } },
      'Mastered': { checkbox: false },
    };

    if (data.audio_url) {
      properties['Audio'] = { url: data.audio_url };
    }

    // Create the page with lesson content in body
    const children = [];

    // Translations
    if (data.translations && Object.keys(data.translations).length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: 'Translations' } }] }
      });

      for (const [lang, trans] of Object.entries(data.translations).slice(0, 10)) {
        const translation = trans.translation || trans.word || JSON.stringify(trans);
        children.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              { text: { content: `${lang.toUpperCase()}: ` }, annotations: { bold: true } },
              { text: { content: translation } }
            ]
          }
        });
      }
    }

    return this.notion.pages.create({
      parent: { database_id: databaseId },
      properties,
      children
    });
  }

  // Create a daily word page (standalone)
  async createDailyWordPage(parentPageId, word) {
    const data = await this.apiGet(`/word/${encodeURIComponent(word)}?tone=adult&translate=es,fr,ja,zh,ar`);

    let lessonData;
    try {
      lessonData = await this.apiGet(`/lesson?word=${encodeURIComponent(word)}&age_group=adult`);
    } catch { lessonData = null; }

    const children = [
      {
        object: 'block', type: 'callout',
        callout: {
          icon: { emoji: '📖' },
          rich_text: [
            { text: { content: `${data.part_of_speech || data.pos || ''} | ${data.ipa || ''}` } }
          ]
        }
      },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Definition' } }] } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: data.definition || data.def || '' } }] } },
    ];

    if (data.etymology || data.etym) {
      children.push(
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Etymology' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: data.etymology || data.etym } }] } }
      );
    }

    // Add lesson phases
    if (lessonData) {
      const phases = lessonData.phases || lessonData;
      children.push(
        { object: 'block', type: 'divider', divider: {} },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Lesson' } }] } }
      );

      for (const [key, label] of [['hook', 'Hook'], ['story', 'Story'], ['wonder', 'Wonder'], ['action', 'Action'], ['wisdom', 'Wisdom']]) {
        const content = phases[key] || lessonData[key];
        if (content) {
          const text = typeof content === 'string' ? content : JSON.stringify(content);
          children.push(
            { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: label } }] } },
            { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: text.slice(0, 2000) } }] } }
          );
        }
      }
    }

    children.push(
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: 'Powered by wordorb.ai' }, link: { url: 'https://wordorb.ai' } }] } }
    );

    return this.notion.pages.create({
      parent: { page_id: parentPageId },
      properties: {
        title: { title: [{ text: { content: `Word of the Day: ${data.word || word}` } }] }
      },
      icon: { emoji: '🔮' },
      children
    });
  }
}

module.exports = { WordOrbNotion };

// CLI usage
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  const integration = new WordOrbNotion(process.env.NOTION_TOKEN, process.env.WORDORB_API_KEY);

  (async () => {
    switch (command) {
      case 'create-db':
        const db = await integration.createVocabularyDatabase(args[0]);
        console.log('Database created:', db.id);
        break;
      case 'add-word':
        await integration.addWord(args[0], args[1]);
        console.log(`Added: ${args[1]}`);
        break;
      case 'daily':
        await integration.createDailyWordPage(args[0], args[1] || 'serendipity');
        console.log('Daily word page created');
        break;
      default:
        console.log('Usage:');
        console.log('  node notion-integration.js create-db <parent-page-id>');
        console.log('  node notion-integration.js add-word <database-id> <word>');
        console.log('  node notion-integration.js daily <parent-page-id> [word]');
    }
  })();
}
