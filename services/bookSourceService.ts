
import { BookSource, Book, Chapter } from "../types";

/**
 * 极简 Legado 规则解析引擎
 */
export class LegadoParser {
  private domParser = new DOMParser();
  
  // 默认代理前缀。用户可以在 UI 中修改并保存到 localStorage
  // 常见的公开代理: 'https://corsproxy.io/?', 'https://api.allorigins.win/raw?url='
  private getProxyPrefix(): string {
    return localStorage.getItem('pureRead_proxy_prefix') || 'https://corsproxy.io/?';
  }

  private getProxiedUrl(url: string): string {
    if (!url) return "";
    // 如果是本地路径或已经包含了代理前缀，则不处理
    const prefix = this.getProxyPrefix();
    if (url.startsWith('http') && !url.includes(window.location.hostname) && !url.startsWith(prefix)) {
      // 某些代理要求直接拼接，某些要求 encode
      return `${prefix}${encodeURIComponent(url)}`;
    }
    return url;
  }

  /**
   * 抓取并解析书籍列表
   */
  async fetchBookList(source: BookSource, url: string): Promise<any[]> {
    try {
      const proxiedUrl = this.getProxiedUrl(url);
      console.log(`[Parser] Fetching list: ${url} via ${proxiedUrl}`);
      
      const response = await fetch(proxiedUrl, {
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml' }
      });
      
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      
      const html = await response.text();
      const doc = this.domParser.parseFromString(html, 'text/html');
      
      const rules = source.ruleExplore || source.ruleSearch;
      if (!rules || !rules.bookList) return [];

      const items = this.queryElements(doc, rules.bookList);
      return items.map(item => ({
        title: this.evaluateRule(item, rules.name),
        author: this.evaluateRule(item, rules.author),
        coverUrl: this.evaluateRule(item, rules.coverUrl, source.bookSourceUrl),
        description: this.evaluateRule(item, rules.intro || rules.kind),
        category: this.evaluateRule(item, rules.kind),
        bookUrl: this.evaluateRule(item, rules.bookUrl, source.bookSourceUrl),
      }));
    } catch (error) {
      console.error("本地解析书籍列表失败:", error);
      return [];
    }
  }

  /**
   * 抓取并解析书籍详情
   */
  async fetchBookDetail(source: BookSource, bookUrl: string): Promise<Partial<Book>> {
    try {
      const proxiedUrl = this.getProxiedUrl(bookUrl);
      const response = await fetch(proxiedUrl);
      const html = await response.text();
      const doc = this.domParser.parseFromString(html, 'text/html');
      
      const infoRules = source.ruleBookInfo;
      const tocUrl = infoRules?.tocUrl ? this.evaluateRule(doc, infoRules.tocUrl, bookUrl) : bookUrl;

      let tocDoc = doc;
      if (tocUrl !== bookUrl) {
        const proxiedTocUrl = this.getProxiedUrl(tocUrl);
        const tocRes = await fetch(proxiedTocUrl);
        const tocHtml = await tocRes.text();
        tocDoc = this.domParser.parseFromString(tocHtml, 'text/html');
      }

      const tocRules = source.ruleToc;
      const chapterItems = this.queryElements(tocDoc, tocRules.chapterList);
      
      // 限制前10章以保证加载速度
      const chapters: Chapter[] = await Promise.all(
        chapterItems.slice(0, 10).map(async (item, idx) => {
          const title = this.evaluateRule(item, tocRules.chapterName);
          const url = this.evaluateRule(item, tocRules.chapterUrl, bookUrl);
          return {
            id: `ch-${idx}`,
            title,
            content: await this.fetchChapterContent(source, url)
          };
        })
      );

      return {
        chapters,
        description: infoRules ? this.evaluateRule(doc, infoRules.intro) : ""
      };
    } catch (error) {
      console.error("本地解析详情失败:", error);
      return { chapters: [] };
    }
  }

  private async fetchChapterContent(source: BookSource, url: string): Promise<string> {
    try {
      if (!url) return "章节链接无效";
      const proxiedUrl = this.getProxiedUrl(url);
      const res = await fetch(proxiedUrl);
      const html = await res.text();
      const doc = this.domParser.parseFromString(html, 'text/html');
      return this.evaluateRule(doc, source.ruleContent?.content || "body") || "内容提取失败";
    } catch {
      return "内容加载失败";
    }
  }

  private evaluateRule(context: Element | Document, rule: string | undefined, baseUrl?: string): string {
    if (!rule) return "";
    const [mainRule, ...regexParts] = rule.split('##');
    const [selectorPart, sourcePart = 'text'] = mainRule.split('@');
    
    let result = "";
    if (selectorPart.trim()) {
      const elements = this.queryElements(context, selectorPart);
      if (elements.length > 0) {
        const el = elements[0];
        if (sourcePart === 'text') result = el.textContent || "";
        else if (sourcePart === 'html') result = el.innerHTML || "";
        else if (sourcePart === 'href') result = el.getAttribute('href') || "";
        else if (sourcePart === 'src') result = el.getAttribute('src') || "";
        else result = el.getAttribute(sourcePart) || "";
      }
    } else {
      const el = context as Element;
      if (sourcePart === 'text') result = el.textContent || "";
      else if (sourcePart === 'href') result = el.getAttribute('href') || "";
    }

    if (regexParts.length > 0) {
      for (let i = 0; i < regexParts.length; i += 2) {
        const regexStr = regexParts[i];
        const replaceStr = regexParts[i+1] || "";
        if (regexStr) {
          try { result = result.replace(new RegExp(regexStr, 'g'), replaceStr); } catch (e) {}
        }
      }
    }

    if (baseUrl && result && (sourcePart === 'href' || sourcePart === 'src' || rule.toLowerCase().includes('url'))) {
      try { result = new URL(result, baseUrl).href; } catch (e) {}
    }

    return result.trim();
  }

  private queryElements(context: Element | Document, selector: string): Element[] {
    let finalSelector = selector;
    let indexFilter: number | null = null;
    if (selector.includes('.')) {
      const parts = selector.split('.');
      if (!isNaN(parseInt(parts[1]))) {
        finalSelector = parts[0];
        indexFilter = parseInt(parts[1]);
      }
    }
    try {
      let elements = Array.from(context.querySelectorAll(finalSelector || 'body'));
      if (indexFilter !== null) elements = elements.slice(indexFilter, indexFilter + 1);
      return elements;
    } catch (e) { return []; }
  }
}

export const bookParser = new LegadoParser();
