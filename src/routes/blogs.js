// src/routes/blogs.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const { renderMarkdown } = require('../services/markdown');

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

    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.post.count({ where })
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    // Get categories counts
    const categories = [
      'Embedded Electronics',
      'Guides',
      'Troubleshooting',
      'Industry Info'
    ];

    res.locals.seo.title = category 
      ? `${category} Articles & Guides | Embedded India Blog`
      : 'Embedded Electronics, Firmware & Hardware Engineering Blog | Embedded India';
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
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug }
    });

    if (!post || (post.status !== 'published' && !req.cookies.admin_token)) {
      return res.status(404).render('pages/message', {
        title: 'Article Not Found',
        heading: '404 - Article Not Found',
        message: 'The requested technical guide may have been moved or is still being drafted.',
        buttonText: 'Browse All Articles',
        buttonLink: '/blogs'
      });
    }

    // Increment view count asynchronously
    prisma.post.update({
      where: { id: post.id },
      data: { views: { increment: 1 } }
    }).catch(() => {});

    // Render markdown to HTML with highlight.js syntax highlighting
    const renderedHtml = renderMarkdown(post.contentMarkdown);

    // Fetch related articles
    const relatedPosts = await prisma.post.findMany({
      where: {
        id: { not: post.id },
        category: post.category,
        status: 'published'
      },
      take: 3
    });

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
        name: post.author || 'Embedded India'
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
