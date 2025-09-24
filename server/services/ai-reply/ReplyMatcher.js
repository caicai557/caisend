const natural = require('natural');
const { ReplyTemplate } = require('../../models');

class ReplyMatcher {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.classifier = new natural.BayesClassifier();
  }

  /**
   * 分析最近的聊天记录并找到最佳回复
   */
  async findBestReply(messages, userId, chatId) {
    if (!messages || messages.length === 0) return null;

    // 获取用户的回复模板
    const templates = await ReplyTemplate.findAll({
      where: {
        user_id: userId,
        is_active: true,
        ...(chatId && { chat_id: chatId })
      },
      order: [['priority', 'DESC']]
    });

    if (templates.length === 0) return null;

    // 分析最后几条消息
    const recentMessages = messages.slice(-5);
    const context = this.extractContext(recentMessages);
    
    // 匹配最佳模板
    let bestMatch = null;
    let highestScore = 0;

    for (const template of templates) {
      const score = await this.calculateMatchScore(context, template);
      
      if (score > highestScore && score > 0.5) {
        highestScore = score;
        bestMatch = template;
      }
    }

    if (bestMatch) {
      // 更新使用统计
      await bestMatch.update({
        usage_count: bestMatch.usage_count + 1,
        last_used_at: new Date()
      });
    }

    return bestMatch;
  }

  /**
   * 提取消息上下文
   */
  extractContext(messages) {
    const context = {
      text: messages.map(m => m.content).join(' '),
      keywords: [],
      sentiment: null,
      intent: null
    };

    // 提取关键词
    const tokens = this.tokenizer.tokenize(context.text.toLowerCase());
    context.keywords = tokens.filter(token => token.length > 3);

    // 情感分析
    const sentiment = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    context.sentiment = sentiment.getSentiment(tokens);

    return context;
  }

  /**
   * 计算匹配分数
   */
  async calculateMatchScore(context, template) {
    let score = 0;

    switch (template.match_type) {
      case 'exact':
        score = this.exactMatch(context.text, template.trigger_keywords);
        break;
      
      case 'contains':
        score = this.containsMatch(context.keywords, template.trigger_keywords);
        break;
      
      case 'regex':
        score = this.regexMatch(context.text, template.trigger_keywords);
        break;
      
      case 'ai':
        score = await this.aiMatch(context, template);
        break;
      
      default:
        score = 0;
    }

    // 考虑优先级
    score = score * (1 + template.priority / 100);

    return Math.min(score, 1);
  }

  /**
   * 精确匹配
   */
  exactMatch(text, keywords) {
    if (!Array.isArray(keywords)) return 0;
    
    for (const keyword of keywords) {
      if (text.toLowerCase() === keyword.toLowerCase()) {
        return 1;
      }
    }
    return 0;
  }

  /**
   * 包含匹配
   */
  containsMatch(contextKeywords, templateKeywords) {
    if (!Array.isArray(templateKeywords)) return 0;
    
    let matches = 0;
    for (const keyword of templateKeywords) {
      if (contextKeywords.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return templateKeywords.length > 0 
      ? matches / templateKeywords.length 
      : 0;
  }

  /**
   * 正则匹配
   */
  regexMatch(text, patterns) {
    if (!Array.isArray(patterns)) return 0;
    
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          return 1;
        }
      } catch (e) {
        console.error('Invalid regex pattern:', pattern);
      }
    }
    return 0;
  }

  /**
   * AI智能匹配
   */
  async aiMatch(context, template) {
    // 使用TF-IDF计算相似度
    this.tfidf.addDocument(context.text);
    this.tfidf.addDocument(template.trigger_keywords.join(' '));
    
    let similarity = 0;
    this.tfidf.tfidfs(context.keywords[0] || '', (i, measure) => {
      if (i === 1) similarity = measure;
    });

    // 情感匹配
    if (template.metadata?.sentiment) {
      const sentimentDiff = Math.abs(context.sentiment - template.metadata.sentiment);
      similarity = similarity * (1 - sentimentDiff / 10);
    }

    return similarity;
  }

  /**
   * 生成个性化回复
   */
  personalizeReply(template, context) {
    let reply = template.reply_text;

    // 替换变量
    const variables = {
      '{name}': context.senderName || 'there',
      '{time}': new Date().toLocaleTimeString(),
      '{date}': new Date().toLocaleDateString()
    };

    for (const [key, value] of Object.entries(variables)) {
      reply = reply.replace(new RegExp(key, 'g'), value);
    }

    return reply;
  }
}

module.exports = ReplyMatcher;