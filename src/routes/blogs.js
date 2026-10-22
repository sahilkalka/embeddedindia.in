// src/routes/blogs.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const { renderMarkdown } = require('../services/markdown');

// Taxonomy mapping for core engineering guides
const CORE_CATEGORY_MAP = {
  'bridging-the-divide': 'Co-Development',
  'hardware-in-the-loop-hil': 'Functional Safety',
  'pcb-obsolescence': 'Lifecycle Management',
  'securing-the-boot-chain': 'Embedded Security'
};

function normalizePost(post) {
  if (!post) return post;
  const p = { ...post };
  if (CORE_CATEGORY_MAP[p.slug]) {
    p.category = CORE_CATEGORY_MAP[p.slug];
  } else if (!p.category || p.category === 'Uncategorized') {
    p.category = 'Embedded Electronics';
  }

  if (!p.author || p.author.toLowerCase() === 'admin') {
    p.author = 'Embedded India Engineering Team';
  }
  return p;
}

function injectInArticleAd(html, settings = {}) {
  if (settings.ad_slot_in_article !== 'true') return html;

  const targetP = Math.max(1, parseInt(settings.ad_in_article_p_index, 10) || 3);
  let pCount = 0;
  let splitIndex = -1;
  const regex = /<\/p>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    pCount++;
    if (pCount === targetP) {
      splitIndex = match.index + match[0].length;
      break;
    }
  }

  if (splitIndex === -1 && pCount > 0) {
    splitIndex = html.lastIndexOf('</p>') + 4;
  }

  if (splitIndex === -1) return html;

  let adHtml = '';
  if (settings.carbon_serve_id && settings.enable_carbon_ads === 'true') {
    adHtml = `
      <div class="my-8 p-4 bg-slate-50 dark:bg-brand-surface rounded-2xl border border-slate-200 dark:border-brand-border text-center not-prose ad-slot-container">
        <span class="block mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">Carbon Sponsored</span>
        <script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=${settings.carbon_serve_id}&placement=${settings.carbon_placement_id || 'embeddedindiain'}" id="_carbonads_js"></script>
      </div>`;
  } else if (settings.enable_sponsor_banner === 'true' && settings.sponsor_banner_img) {
    adHtml = `
      <div class="my-8 p-5 bg-gradient-to-r from-slate-900 to-brand-900 rounded-2xl border border-brand-700 text-center text-white not-prose shadow-lg ad-slot-container">
        <span class="block mb-2 text-[10px] uppercase font-bold tracking-wider text-emerald-400">Featured Industry Sponsor</span>
        <a href="${settings.sponsor_banner_url || '#'}" target="_blank" rel="noopener sponsored" class="inline-block group">
          <img src="${settings.sponsor_banner_img}" alt="${settings.sponsor_banner_alt || 'Sponsor'}" class="max-h-24 mx-auto rounded-lg shadow-md mb-2 object-contain">
          <p class="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">${settings.sponsor_banner_text || ''}</p>
        </a>
      </div>`;
  } else if (settings.custom_ad_html_in_article && settings.custom_ad_html_in_article.trim()) {
    adHtml = `
      <div class="my-8 p-4 bg-white dark:bg-brand-surface rounded-2xl border border-slate-200 dark:border-brand-border text-center not-prose ad-slot-container">
        <span class="block mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">Advertisement</span>
        ${settings.custom_ad_html_in_article}
      </div>`;
  } else if (settings.enable_adsense === 'true' && settings.adsense_pub_id) {
    adHtml = `
      <div class="my-8 p-4 bg-white dark:bg-brand-surface rounded-2xl border border-slate-200 dark:border-brand-border text-center not-prose ad-slot-container">
        <span class="block mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">Advertisement</span>
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="${settings.adsense_pub_id}"
             data-ad-slot="${settings.adsense_in_article_slot || '1234567890'}"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      </div>`;
  }

  if (!adHtml) return html;
  return html.slice(0, splitIndex) + adHtml + html.slice(splitIndex);
}

// GET /blogs - Blog index with categories, search & pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const category = req.query.category || undefined;
    const tag = req.query.tag || undefined;
    const search = req.query.q ? req.query.q.trim() : undefined;

    const where = {
      status: 'published'
    };

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { contentMarkdown: { contains: search } }
      ];
    }

    const [rawPosts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.post.count({ where })
    ]);

    const posts = rawPosts.map(normalizePost);
    const totalPages = Math.ceil(totalPosts / limit);

    // Get categories taxonomy
    const categories = [
      'Co-Development',
      'Functional Safety',
      'Lifecycle Management',
      'Embedded Security',
      'Embedded Electronics',
      'Guides',
      'Troubleshooting',
      'Industry Info'
    ];

    // Set page title to "Blogs - Embedded India"
    res.locals.seo.title = 'Blogs - Embedded India';
    res.locals.seo.description = 'Deep-dive technical guides on embedded systems, high-speed PCB design, HIL testing, TinyML edge computing, and firmware security from industry practitioners.';

    res.render('pages/blogs/index', {
      posts,
      currentPage: page,
      totalPages,
      totalPosts,
      selectedCategory: category,
      selectedTag: tag,
      searchQuery: search,
      categories
    });
  } catch (err) {
    console.error('[BLOG INDEX ERROR]', err);
    res.status(500).send('Error loading blog posts');
  }
});

// GET /blogs/:slug - Individual Post Page
router.get('/:slug', async (req, res) => {
  try {
    const rawPost = await prisma.post.findUnique({
      where: { slug: req.params.slug }
    });

    if (!rawPost || (rawPost.status !== 'published' && !req.cookies.admin_token)) {
      return res.status(404).render('pages/message', {
        title: 'Article Not Found',
        heading: '404 - Article Not Found',
        message: 'The requested technical guide may have been moved or is still being drafted.',
        buttonText: 'Browse All Articles',
        buttonLink: '/blogs'
      });
    }

    const post = normalizePost(rawPost);

    // Increment view count asynchronously
    prisma.post.update({
      where: { id: rawPost.id },
      data: { views: { increment: 1 } }
    }).catch(() => {});

    // Render markdown to HTML with highlight.js syntax highlighting
    let renderedHtml = renderMarkdown(post.contentMarkdown);

    // Auto-inject in-article ad slot if configured in Settings
    renderedHtml = injectInArticleAd(renderedHtml, res.locals.settings || {});

    // Fetch related articles
    const rawRelated = await prisma.post.findMany({
      where: {
        id: { not: post.id },
        category: post.category,
        status: 'published'
      },
      take: 3
    });
    const relatedPosts = rawRelated.map(normalizePost);

    // Populate SEO tags
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.locals.seo.title = `${post.title} | Embedded India`;
    res.locals.seo.description = post.summary || post.seoDescription;
    res.locals.seo.ogImage = `${appUrl}/api/og?title=${encodeURIComponent(post.title)}&category=${encodeURIComponent(post.category)}`;
    res.locals.seo.ogType = 'article';
    res.locals.seo.structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.summary,
      author: {
        '@type': 'Organization',
        name: post.author || 'Embedded India Engineering Team'
      },
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt?.toISOString(),
      mainEntityOfPage: `${appUrl}/blogs/${post.slug}`
    };

    res.render('pages/blogs/post', {
      post,
      contentHtml: renderedHtml,
      relatedPosts
    });
  } catch (err) {
    console.error('[BLOG POST ERROR]', err);
    res.status(500).send('Error rendering blog post');
  }
});

module.exports = router;
