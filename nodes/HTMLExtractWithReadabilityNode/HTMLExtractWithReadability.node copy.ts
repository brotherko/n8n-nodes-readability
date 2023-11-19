/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { browser } from './utils/browser';
import fetch from 'node-fetch';

const parseHtml = (html: string) => {
	const doc = new JSDOM(html);
	const reader = new Readability(doc.window.document);
	const article = reader.parse();
	return article;
};

async function getHtmlWithFetch(url: string) {
	const response = await fetch(url);
	const html = await response.text();
	return html;
}

async function getHtmlWithPuppeteer(url: string) {
	const page = await browser.CreatePage(url, { timeout: 10 * 1000 });
	const html = await page.content();
	return html;
}

export class HTMLExtractWithReadability implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Extract HTML with Readability',
		name: 'exampleNode',
		group: ['transform'],
		version: 1,
		description: 'Extract the content of a webpage with Readability',
		defaults: {
			name: 'Extract HTML with Readability',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: 'data',
				placeholder: 'data',
				description: 'Key to the html content',
			},
		],
	};
	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const key = this.getNodeParameter('key', itemIndex, '') as string;
				const usePuppeteer = this.getNodeParameter('usePuppeteer', itemIndex, '') as string;
				item = items[itemIndex];
				if (!(key in item.json)) {
					throw new Error(`The specified ${key} is not found on item ${itemIndex}`);
				}
				const url = item.json[key] as string;
				const html = usePuppeteer ? await getHtmlWithPuppeteer(url) : await getHtmlWithFetch(url);
				const parsed = parseHtml(html);
				item.json = parsed || {};
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
