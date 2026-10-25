jest.mock('../src/services/db', () => ({
  project: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) }
}));
jest.mock('../src/middleware/auth', () => ({ requireAuth: (req, res, next) => next() }));
jest.mock('../src/middleware/rateLimiter', () => ({ loginLimiter: (req, res, next) => next() }));
jest.mock('../src/middleware/seo', () => ({ clearSettingsCache: jest.fn() }));
jest.mock('../src/cron/jobs', () => ({}));
jest.mock('../src/services/aiGenerator', () => ({}));
jest.mock('../src/services/aiScheduler', () => ({}));
jest.mock('../src/services/mailer', () => ({}));
jest.mock('../src/services/markdown', () => ({ renderMarkdown: value => value }));

const express = require('express');
const request = require('supertest');
const prisma = require('../src/services/db');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use('/admin', require('../src/routes/admin'));

beforeEach(() => jest.clearAllMocks());

test.each([
  ['/admin/projects/new', 'create'],
  ['/admin/projects/test-project/edit', 'update']
])('persists a normalized iframe through %s', async (route, operation) => {
  await request(app).post(route).type('form').send({
    title: 'Test project',
    videoUrl: '<iframe src="https://www.youtube.com/embed/HQbmP7AgbkE?si=example"></iframe>'
  }).expect(302).expect('Location', '/admin/projects?saved=1');
  expect(prisma.project[operation]).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ videoUrl: 'https://www.youtube-nocookie.com/embed/HQbmP7AgbkE?rel=0' })
  }));
});

test.each(['/admin/projects/new', '/admin/projects/test-project/edit'])('rejects invalid video before writing: %s', async route => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await request(app).post(route).type('form').send({
      title: 'Test project', videoUrl: 'not a video'
    }).expect(400);
    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
