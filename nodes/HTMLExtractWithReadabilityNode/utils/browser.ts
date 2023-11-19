import * as puppeteer from 'puppeteer';

const Logger = console;

class Browser implements IBrowser {
	private browser!: puppeteer.Browser;
	private readonly TIMEOUT: number;
	private readonly USER_AGENT = 'INSERT_USERAGENT';

	constructor(_timeout: number = 30000) {
		this.TIMEOUT = _timeout;

		// For debugging try these Puppeteer Params:
		// headless: true
		// executablePath: PathToCustomChromiumInstall
		// devtools: true
		// slowMo: 2000

		// Starting the async Init flow
		(async () => {
			await this.Init();
		})();
	}

	public async GetBrowserInstance(): Promise<puppeteer.Browser> {
		return this.browser;
	}

	public async CreatePage(
		URL: string,
		options: puppeteer.GoToOptions = { waitUntil: 'load' },
	): Promise<puppeteer.Page> {
		const page = await this.browser.newPage();

		await page.setViewport({
			width: 1920,
			height: 1080,
			deviceScaleFactor: 1,
			hasTouch: false,
			isLandscape: false,
			isMobile: false,
		});

		await page.setUserAgent(this.USER_AGENT);
		await page.setJavaScriptEnabled(true);
		await page.setDefaultNavigationTimeout(this.TIMEOUT);

		//skips css fonts and images for performance and efficiency
		await page.setRequestInterception(true);
		page.on('request', (req) => {
			if (
				req.resourceType() == 'font' ||
				req.resourceType() == 'image' ||
				req.resourceType() == 'stylesheet'
			) {
				req.abort();
			} else {
				req.continue();
			}
		});

		try {
			await page.goto(URL, options);
		} catch (err) {
			await page.close();
			throw err;
		}

		return page;
	}

	private async Init(HeadLess: boolean = true, SlowDown: number = 0, DevTools: boolean = false) {
		Logger.log('Puppeteer browser init. Timeout set to: ' + this.TIMEOUT.toString());
		this.browser = await this.StartBrowser(HeadLess, SlowDown, DevTools);

		// Listen to Disconnect event, and restart.
		this.browser.on('disconnected', async () => {
			Logger.log('Puppeteer browser crashed, Restarting browser.');
			await this.ReleaseBrowser();
			if (this.browser && this.browser.process() != null) {
				this.browser.process()?.kill('SIGINT');
			}
			await this.Init();
		});
	}

	private async ReleaseBrowser() {
		Logger.log('Puppeteer browser releasing and closing.');
		if (this.browser) await this.browser.close();
	}

	private async StartBrowser(
		HeadLess: boolean,
		SlowDown: number,
		DevTools: boolean,
	): Promise<puppeteer.Browser> {
		Logger.log('Puppeteer browser starting up with slowdown set to: ' + SlowDown);

		return await puppeteer.launch({
			headless: HeadLess,
			devtools: DevTools,
			ignoreHTTPSErrors: true,
			slowMo: SlowDown,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--no-zygote',
				'--disable-gpu',
				// '--single-process'
				// '--user-data-dir=./'
			],
		});
	}
}

export interface IBrowser {
	GetBrowserInstance(): Promise<puppeteer.Browser>;
	CreatePage(URL: string, options: puppeteer.GoToOptions): Promise<puppeteer.Page>;
}

export const browser = new Browser();
