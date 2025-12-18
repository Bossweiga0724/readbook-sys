
import { BookSource, Book, Chapter } from "../types";

/**
 * 极简 Legado 规则解析引擎
 */
export class LegadoParser {
  private domParser = new DOMParser();
  
  private getProxyPrefix(): string {
    // 优先从缓存获取，默认指向 88 端口的 /proxy 路径
    return localStorage.getItem('pureRead_proxy_prefix') || 'http://129.204.21.239:88/proxy?url=';
  }

  /**
   * 核心转换逻辑：将原始 URL 包装成代理 URL
   */
  private getProxiedUrl(url: string): string {
    if (!url) return "";
    
    // 如果不是 http 开头的完整路径，可能是相对路径，暂不处理（交给 fetch 报错或 baseUrl 处理）
    if (!url.startsWith('http')) return url;

    const prefix = this.getProxyPrefix();
    
    // 如果没有配置代理，直接返回
    if (!prefix) return url;

    // 如果当前 URL 已经包含了代理前缀，则不再重复包装
    if (url.startsWith(prefix)) return url;

    // 智能处理前缀格式：确保 prefix 最终以 "url=" 结尾
    let finalPrefix = prefix;
    if (!prefix.includes('url=')) {
      const connector = prefix.includes('?') ? '&url=' : '?url=';
      finalPrefix = prefix + connector;
    }

    const proxied = `${finalPrefix}${encodeURIComponent(url)}`;
    console.log(`[Proxy Linker] Original: ${url} -> Proxied: ${proxied}`);
    return proxied;
  }

  /**
   * 抓取并解析书籍列表
   */
  async fetchBookList(source: BookSource, url: string): Promise<any[]> {
    try {
      const proxiedUrl = this.getProxiedUrl(url);
      console.log(`[Parser] Fetching list: ${proxiedUrl}`);
      
      const response = await fetch(proxiedUrl, {
        headers: { 
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
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
      console.error("解析书籍列表失败:", error);
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
      // 这里的 tocUrl 如果是相对路径，会在 evaluateRule 中根据 bookUrl 转成绝对路径
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
      
      // 解析前10章预览
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
      console.error("解析详情失败:", error);
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

  /**
   * 规则求值核心逻辑：将相对路径转换为基于代理的绝对路径
   */
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

    // 正则处理
    if (regexParts.length > 0) {
      for (let i = 0; i < regexParts.length; i += 2) {
        const regexStr = regexParts[i];
        const replaceStr = regexParts[i+1] || "";
        if (regexStr) {
          try { result = result.replace(new RegExp(regexStr, 'g'), replaceStr); } catch (e) {}
        }
      }
    }

    // 绝对路径转换逻辑
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
