import Anthropic from '@anthropic-ai/sdk';

class ClaudeService {
  constructor() {
    this.client = null;
    this.model = 'claude-sonnet-4-5-20250929';
  }

  initialize(apiKey) {
    if (!apiKey) {
      throw new Error('Claude API key is required');
    }
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      thinking: {
        type: "enabled",
        budget_tokens: 10000
      },
    });
  }

  async generateText(prompt) {
    if (!this.client) {
      throw new Error('Claude service not initialized');
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ],
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Error generating text with Claude:', error);
      throw error;
    }
  }

  async generateTextWithSystemPrompt(systemPrompt, userPrompt) {
    if (!this.client) {
      throw new Error('Claude service not initialized');
    }

    try {
      // Utiliser le streaming pour éviter le timeout de 10 minutes
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: 64000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });

      // Collecter la réponse complète depuis le stream
      const message = await stream.finalMessage();
      const text = message.content[0].text;

      // Log pour debug
      console.log('Claude stop_reason:', message.stop_reason);
      if (message.stop_reason === 'max_tokens') {
        console.warn('ATTENTION: Réponse tronquée à cause de max_tokens!');
      }

      console.log('Longueur de la réponse Claude:', text.length, 'caractères');
      console.log('=== RÉPONSE CLAUDE BRUTE ===');
      console.log(text);
      console.log('=== FIN RÉPONSE CLAUDE ===');

      return text;
    } catch (error) {
      console.error('Error generating text with system prompt (Claude):', error);
      throw error;
    }
  }

  async generateTextStream(prompt) {
    if (!this.client) {
      throw new Error('Claude service not initialized');
    }

    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ],
      });

      return stream;
    } catch (error) {
      console.error('Error generating text stream with Claude:', error);
      throw error;
    }
  }

  async chat(messages) {
    if (!this.client) {
      throw new Error('Claude service not initialized');
    }

    try {
      // Convertir le format des messages pour Claude
      const claudeMessages = messages.map(msg => ({
        role: msg.role,
        content: typeof msg.parts === 'string' ? msg.parts : msg.parts.join('\n'),
      }));

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: claudeMessages,
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Error in Claude chat:', error);
      throw error;
    }
  }
}

export default new ClaudeService();
