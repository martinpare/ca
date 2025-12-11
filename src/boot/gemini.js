import { boot } from 'quasar/wrappers';
import geminiService from 'src/services/gemini';
import claudeService from 'src/services/claude';

export default boot(({ app }) => {
  // Initialiser Gemini
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!geminiApiKey) {
    console.error('VITE_GEMINI_API_KEY is not set in environment variables');
  } else {
    try {
      geminiService.initialize(geminiApiKey);
      console.log('Gemini API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
    }
  }

  // Initialiser Claude
  const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY;

  if (!claudeApiKey) {
    console.error('VITE_CLAUDE_API_KEY is not set in environment variables');
  } else {
    try {
      claudeService.initialize(claudeApiKey);
      console.log('Claude API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Claude API:', error);
    }
  }

  // Make services available globally
  app.config.globalProperties.$gemini = geminiService;
  app.config.globalProperties.$claude = claudeService;
});

export { geminiService, claudeService };
