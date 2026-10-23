const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({

    testDir: './tests',

    timeout: 30000,

    use: {
        baseURL: 'http://localhost:3000',

        headless: true,

        screenshot: 'only-on-failure',

        trace: 'retain-on-failure'
    },

    webServer: {
        command: 'npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000
    },

    reporter: [
        ['list'],
        ['html', { open: 'never' }]
    ]
});